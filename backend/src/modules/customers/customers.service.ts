import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { CartItem } from '../../common/entities/cart-item.entity';
import { Cart } from '../../common/entities/cart.entity';
import { CustomerAddress } from '../../common/entities/customer-address.entity';
import { CustomerGroupMap } from '../../common/entities/customer-group-map.entity';
import { CustomerPrice } from '../../common/entities/customer-price.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerWhatsappPermission } from '../../common/entities/customer-whatsapp-permission.entity';
import { RefreshToken } from '../../common/entities/refresh-token.entity';
import { User } from '../../common/entities/user.entity';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { normalizeCustomerMobile } from '../../common/utils/phone-normalize.util';
import { CreditLedgerTransactionType } from '../../common/enums/credit-ledger-transaction-type.enum';
import { CreditLedgerService } from './credit-ledger.service';
import { CustomersCreditService } from './customers-credit.service';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CustomerCreditAdjustDto } from './dto/customer-credit-adjust.dto';
import { CustomerCreditLedgerQueryDto } from './dto/customer-credit-ledger-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerAddressInputDto } from './dto/customer-address-input.dto';
import { StorefrontCustomerProfileUpdateDto } from './dto/storefront-customer-profile-update.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  BulkCustomerWhatsappPermissionsDto,
  PatchCustomerWhatsappPermissionsDto,
} from './dto/customer-whatsapp-permissions.dto';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { PrivateDocumentsService } from '../private-documents/private-documents.service';
import { NotificationsService } from '../notifications/notifications.service';

function toMoneyString(v: string | undefined, fallback = '0.00'): string {
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n))
    throw new BadRequestException('Invalid money amount.');
  if (n < 0) throw new BadRequestException('Amounts must be non-negative.');
  return n.toFixed(2);
}

const GSTIN_RE = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/u;

function normalizeGstin(value: string | undefined): string {
  return (value ?? '').replace(/\s/g, '').toUpperCase();
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private readonly addressesRepo: Repository<CustomerAddress>,
    @InjectRepository(CustomerWhatsappPermission)
    private readonly waPermRepo: Repository<CustomerWhatsappPermission>,
    private readonly customersCreditService: CustomersCreditService,
    private readonly creditLedgerService: CreditLedgerService,
    private readonly tenantRunner: TenantSchemaRunner,
    private readonly privateDocuments: PrivateDocumentsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Legacy registration flow: creates an inactive retailer pending distributor approval. */
  async registerFromStorefront(
    tenantId: string,
    dto: { companyName: string; mobile: string; email?: string },
  ) {
    const mobile = normalizeCustomerMobile(dto.mobile);
    const customer = this.customersRepo.create({
      tenantId,
      name: dto.companyName.trim(),
      mobile,
      email: dto.email?.trim().toLowerCase() || null,
      status: CustomerStatus.INACTIVE,
      creditLimit: '0.00',
      creditBalance: '0.00',
    });

    try {
      const saved = await this.customersRepo.save(customer);
      await this.notifications.createForTenantStaff({
        tenantId,
        type: 'CUSTOMER_REGISTRATION_REQUESTED',
        title: 'New retailer registration',
        message: `${saved.name} is waiting for account approval.`,
        entityType: 'customer',
        entityId: saved.id,
        actionUrl: `/customers/${saved.id}`,
        metadata: { customerId: saved.id, mobile: saved.mobile },
      });
      await this.waPermRepo.save(
        this.waPermRepo.create({
          customerId: saved.id,
          tenantId,
          canViewStatus: true,
          canViewInvoice: true,
          canPlaceOrder: false,
          canRepeatOrder: false,
          canViewCredit: false,
          canReceiveBroadcast: false,
        }),
      );
      return {
        success: true,
        data: { id: saved.id, status: saved.status },
        meta: {},
        message: 'Registration submitted for distributor approval.',
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code ===
          '23505'
      ) {
        throw new ConflictException(
          'A retailer account with this mobile already exists for this store.',
        );
      }
      throw error;
    }
  }

  /** Storefront JWT (`CUSTOMER`): profile for header / account UI. */
  async profileForStorefrontCustomer(actor: JwtUserPayload) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    const addresses = await this.addressesRepo.find({
      where: { customerId: c.id },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return {
      success: true,
      data: {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        profileImageUrl: this.privateDocuments.sign(c.profileImageUrl),
        creditLimit: c.creditLimit,
        creditBalance: c.creditBalance,
        addresses: addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          countryCode: a.countryCode,
          isDefault: a.isDefault,
        })),
      },
      meta: {},
      message: '',
    };
  }

  /** Validates `addressId` belongs to this tenant’s customer (storefront checkout). */
  async businessProfileForStorefrontCustomer(actor: JwtUserPayload) {
    const c = await this.storefrontCustomer(actor);
    return {
      success: true,
      data: await this.businessProfilePayload(c),
      meta: {},
      message: '',
    };
  }

  async updateBusinessProfileForStorefrontCustomer(
    actor: JwtUserPayload,
    dto: { companyLegalName?: string; gstin?: string },
  ) {
    const c = await this.storefrontCustomer(actor);
    const gstin = normalizeGstin(dto.gstin);
    if (!GSTIN_RE.test(gstin)) {
      throw new BadRequestException('Enter a valid 15-character GSTIN.');
    }
    const legalName = (dto.companyLegalName ?? '').trim();
    if (!legalName) {
      throw new BadRequestException('Company legal name is required.');
    }
    c.businessLegalName = legalName;
    c.gstin = gstin;
    c.gstVerified = false;
    c.gstStatus = 'DOCUMENT_REQUIRED';
    c.gstVerifiedAt = null;
    await this.customersRepo.save(c);
    await this.notifications.createForTenantStaff({
      tenantId: c.tenantId,
      type: 'CUSTOMER_BUSINESS_PROFILE_UPDATED',
      title: 'Retailer business details updated',
      message: `${c.name} updated business details for ${gstin}.`,
      entityType: 'customer',
      entityId: c.id,
      actionUrl: `/customers/${c.id}`,
      metadata: { customerId: c.id, gstin },
    });
    return {
      success: true,
      data: await this.businessProfilePayload(
        c,
        'Upload GST certificate to complete document verification.',
      ),
      meta: {},
      message: 'Business details saved.',
    };
  }

  async uploadBusinessCertificateForStorefrontCustomer(
    actor: JwtUserPayload,
    dto: { companyLegalName?: string; gstin?: string },
    file: Express.Multer.File | undefined,
  ) {
    const c = await this.storefrontCustomer(actor);
    if (!file?.buffer?.length) {
      throw new BadRequestException('GST certificate file is required.');
    }
    const gstin = normalizeGstin(dto.gstin);
    if (!GSTIN_RE.test(gstin)) {
      throw new BadRequestException('Enter a valid 15-character GSTIN.');
    }
    const legalName = (dto.companyLegalName ?? '').trim();
    if (!legalName) {
      throw new BadRequestException('Company legal name is required.');
    }

    const textProbe = file.buffer.toString('utf8').toUpperCase();
    const extractedGstin = textProbe.match(GSTIN_RE)?.[0] ?? null;
    if (extractedGstin && extractedGstin !== gstin) {
      throw new BadRequestException(
        'Uploaded certificate GSTIN does not match entered GSTIN.',
      );
    }

    const tenantId = actor.tenantId;
    const customerId = actor.customerId;
    if (!tenantId || !customerId) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const previousCertificate = c.gstCertificateUrl;
    const stored = await this.privateDocuments.store({
      tenantId,
      category: 'gst-files',
      ownerId: customerId,
      file,
    });

    c.businessLegalName = legalName;
    c.gstin = gstin;
    c.gstVerified = true;
    c.gstStatus = 'VERIFIED';
    c.gstCertificateUrl = stored.reference;
    c.gstCertificateFileName = stored.originalName;
    c.gstVerifiedAt = new Date();
    await this.customersRepo.save(c);
    await this.notifications.createForTenantStaff({
      tenantId,
      type: 'CUSTOMER_GST_DOCUMENT_UPDATED',
      title: 'Retailer GST document updated',
      message: `${c.name} uploaded GST document for ${gstin}.`,
      entityType: 'customer',
      entityId: c.id,
      actionUrl: `/customers/${c.id}`,
      metadata: { customerId: c.id, gstin },
    });
    if (previousCertificate && previousCertificate !== stored.reference) {
      await this.privateDocuments.delete(previousCertificate);
    }

    const message = extractedGstin
      ? 'GST certificate uploaded and GSTIN matched from document text.'
      : 'GST certificate uploaded. No third-party GST API was used; document is verified from uploaded file and entered GSTIN.';
    return {
      success: true,
      data: await this.businessProfilePayload(c, message),
      meta: { extractedGstin },
      message,
    };
  }

  async requireStorefrontCustomer(actor: JwtUserPayload): Promise<Customer> {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    return c;
  }

  private async storefrontCustomer(actor: JwtUserPayload): Promise<Customer> {
    return this.requireStorefrontCustomer(actor);
  }

  async deleteStorefrontCustomerAccount(actor: JwtUserPayload) {
    const c = await this.requireStorefrontCustomer(actor);
    const deletedAt = new Date();
    const anonymizedMobile = `deleted-${c.id.replace(/-/g, '').slice(0, 12)}`;
    await Promise.all([
      this.privateDocuments.delete(c.profileImageUrl),
      this.privateDocuments.delete(c.gstCertificateUrl),
    ]);

    await this.tenantRunner.withTenantCatalog(c.tenantId, async (m) => {
      await m.getRepository(CustomerGroupMap).delete({ customerId: c.id });
      await m.getRepository(CustomerPrice).delete({ customerId: c.id });

      const carts = await m.getRepository(Cart).find({
        where: { tenantId: c.tenantId, userId: actor.sub },
        select: ['id'],
      });
      const cartIds = carts.map((cart) => cart.id);
      if (cartIds.length > 0) {
        await m.getRepository(CartItem).delete({ cartId: In(cartIds) });
        await m.getRepository(Cart).delete({ id: In(cartIds) });
      }
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RefreshToken).delete({ userId: actor.sub });
      await manager.getRepository(CustomerAddress).delete({ customerId: c.id });
      await manager
        .getRepository(CustomerWhatsappPermission)
        .delete({ customerId: c.id });

      await manager.getRepository(User).update(
        { id: actor.sub, role: UserRole.CUSTOMER, customerId: c.id },
        {
          email: null,
          phone: null,
          phoneVerifiedAt: null,
          passwordHash: null,
          customerId: null,
          deletedAt,
        },
      );

      await manager.getRepository(Customer).update(
        { id: c.id, tenantId: c.tenantId, deletedAt: IsNull() },
        {
          name: 'Deleted customer',
          mobile: anonymizedMobile,
          email: null,
          profileImageUrl: null,
          status: CustomerStatus.INACTIVE,
          businessLegalName: null,
          gstin: null,
          gstVerified: false,
          gstStatus: null,
          gstCertificateUrl: null,
          gstCertificateFileName: null,
          gstVerifiedAt: null,
          deletedAt,
        },
      );
    });
    await this.notifications.createForTenantStaff({
      tenantId: c.tenantId,
      type: 'CUSTOMER_ACCOUNT_DELETED',
      title: 'Retailer account deleted',
      message:
        'A retailer deleted their account. Personal information was anonymized.',
      entityType: 'customer',
      actionUrl: '/customers',
      metadata: { customerId: c.id },
    });

    return {
      success: true,
      data: {
        deleted: true,
        retainedRecords: ['orders', 'invoices', 'credit_ledger'],
      },
      meta: {},
      message:
        'Account deleted. Personal profile data has been removed; invoices and required financial records are retained.',
    };
  }

  private async businessProfilePayload(c: Customer, message?: string) {
    return {
      companyLegalName: c.businessLegalName ?? c.name,
      gstin: c.gstin ?? '',
      verified: c.gstVerified === true,
      status: c.gstStatus ?? (c.gstVerified ? 'VERIFIED' : 'UNVERIFIED'),
      message,
      certificateUrl: this.privateDocuments.sign(c.gstCertificateUrl),
      certificateFileName: c.gstCertificateFileName,
      verifiedAt: c.gstVerifiedAt?.toISOString() ?? null,
    };
  }

  async updateStorefrontCustomerProfile(
    actor: JwtUserPayload,
    dto: StorefrontCustomerProfileUpdateDto,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');

    if (dto.name !== undefined) c.name = dto.name.trim();
    if (dto.email !== undefined) {
      const email = (dto.email ?? '').trim();
      c.email = email.length === 0 ? null : email;
    }
    await this.customersRepo.save(c);
    return this.profileForStorefrontCustomer(actor);
  }

  async uploadStorefrontCustomerProfileImage(
    actor: JwtUserPayload,
    file: Express.Multer.File | undefined,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    if (!file) throw new BadRequestException('file is required.');
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Profile image must be 5 MB or smaller.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');

    const previousProfile = c.profileImageUrl;
    const stored = await this.privateDocuments.store({
      tenantId: actor.tenantId,
      category: 'retailer-documents',
      ownerId: actor.customerId,
      file,
    });
    c.profileImageUrl = stored.reference;
    await this.customersRepo.save(c);
    if (previousProfile && previousProfile !== stored.reference) {
      await this.privateDocuments.delete(previousProfile);
    }
    return this.profileForStorefrontCustomer(actor);
  }

  async addAddressForStorefrontCustomer(
    actor: JwtUserPayload,
    dto: CustomerAddressInputDto,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');

    const existingCount = await this.addressesRepo.count({
      where: { customerId: c.id },
    });
    const isDefault = dto.isDefault === true || existingCount === 0;
    if (isDefault) {
      await this.addressesRepo.update(
        { customerId: c.id },
        { isDefault: false },
      );
    }

    const address = await this.addressesRepo.save(
      this.addressesRepo.create({
        customerId: c.id,
        label: dto.label?.trim() || null,
        line1: dto.line1.trim(),
        line2: dto.line2?.trim() || null,
        city: dto.city.trim(),
        state: dto.state.trim(),
        pincode: dto.pincode.trim(),
        countryCode: dto.countryCode?.toUpperCase() ?? null,
        isDefault,
      }),
    );

    return {
      success: true,
      data: {
        id: address.id,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        countryCode: address.countryCode,
        isDefault: address.isDefault,
      },
      meta: {},
      message: 'Address saved.',
    };
  }

  async updateAddressForStorefrontCustomer(
    actor: JwtUserPayload,
    addressId: string,
    dto: CustomerAddressInputDto,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');

    const address = await this.addressesRepo.findOne({
      where: { id: addressId, customerId: c.id },
    });
    if (!address) throw new NotFoundException('Address not found.');

    const isDefault = dto.isDefault === true;
    if (isDefault) {
      await this.addressesRepo.update(
        { customerId: c.id },
        { isDefault: false },
      );
    }

    address.label = dto.label?.trim() || null;
    address.line1 = dto.line1.trim();
    address.line2 = dto.line2?.trim() || null;
    address.city = dto.city.trim();
    address.state = dto.state.trim();
    address.pincode = dto.pincode.trim();
    address.countryCode = dto.countryCode?.toUpperCase() ?? null;
    address.isDefault = isDefault || address.isDefault;

    const saved = await this.addressesRepo.save(address);
    return {
      success: true,
      data: {
        id: saved.id,
        label: saved.label,
        line1: saved.line1,
        line2: saved.line2,
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
        countryCode: saved.countryCode,
        isDefault: saved.isDefault,
      },
      meta: {},
      message: 'Address updated.',
    };
  }

  async setDefaultAddressForStorefrontCustomer(
    actor: JwtUserPayload,
    addressId: string,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    const address = await this.addressesRepo.findOne({
      where: { id: addressId, customerId: c.id },
    });
    if (!address) throw new NotFoundException('Address not found.');
    await this.addressesRepo.update({ customerId: c.id }, { isDefault: false });
    await this.addressesRepo.update({ id: address.id }, { isDefault: true });
    return {
      success: true,
      data: { id: address.id, isDefault: true },
      meta: {},
      message: 'Default address updated.',
    };
  }

  async deleteAddressForStorefrontCustomer(
    actor: JwtUserPayload,
    addressId: string,
  ) {
    if (
      actor.role !== UserRole.CUSTOMER ||
      !actor.customerId ||
      !actor.tenantId
    ) {
      throw new ForbiddenException('Storefront customer session required.');
    }
    const c = await this.customersRepo.findOne({
      where: {
        id: actor.customerId,
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    const address = await this.addressesRepo.findOne({
      where: { id: addressId, customerId: c.id },
    });
    if (!address) throw new NotFoundException('Address not found.');
    await this.addressesRepo.delete({ id: address.id, customerId: c.id });
    if (address.isDefault) {
      const next = await this.addressesRepo.findOne({
        where: { customerId: c.id },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        await this.addressesRepo.update({ id: next.id }, { isDefault: true });
      }
    }
    return {
      success: true,
      data: { id: address.id },
      meta: {},
      message: 'Address deleted.',
    };
  }

  async assertShippingAddressForCustomer(
    tenantId: string,
    customerId: string,
    addressId: string,
  ): Promise<void> {
    const addr = await this.addressesRepo
      .createQueryBuilder('a')
      .innerJoin('a.customer', 'c')
      .where('a.id = :addressId', { addressId })
      .andWhere('c.id = :customerId', { customerId })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL')
      .getOne();
    if (!addr) throw new BadRequestException('Invalid shipping address.');
  }

  async requireActiveByTenantAndMobile(
    tenantId: string,
    mobileDigits: string,
  ): Promise<Customer> {
    const c = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (!c) {
      throw new NotFoundException(
        'No retailer account for this mobile at this store.',
      );
    }
    if (c.status !== CustomerStatus.ACTIVE) {
      throw new ForbiddenException('This retailer account is not active.');
    }
    return c;
  }

  /**
   * Public storefront sign-in allows a new mobile to request OTP. Existing disabled
   * accounts remain blocked so self-registration cannot bypass an administrator action.
   */
  async assertStorefrontCustomerLoginEligible(
    tenantId: string,
    mobileDigits: string,
  ): Promise<void> {
    const existing = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (existing && existing.status !== CustomerStatus.ACTIVE) {
      throw new ForbiddenException('This retailer account is not active.');
    }
  }

  /** An owner can request OTP without a buyer profile, but not if that profile was disabled. */
  async assertOwnerCustomerEligible(
    tenantId: string,
    mobileDigits: string,
  ): Promise<void> {
    const existing = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (existing && existing.status !== CustomerStatus.ACTIVE) {
      throw new ForbiddenException('This retailer account is not active.');
    }
  }

  /** Create a zero-credit buyer profile only after the same tenant's owner verifies their OTP. */
  async ensureVerifiedOwnerCustomer(
    tenantId: string,
    mobileDigits: string,
  ): Promise<Customer> {
    const existing = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (existing) {
      if (existing.status !== CustomerStatus.ACTIVE) {
        throw new ForbiddenException('This retailer account is not active.');
      }
      return existing;
    }

    try {
      return await this.customersRepo.save(
        this.customersRepo.create({
          tenantId,
          name: 'Store owner',
          mobile: mobileDigits,
          email: null,
          status: CustomerStatus.ACTIVE,
          creditLimit: '0.00',
          creditBalance: '0.00',
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code ===
          '23505'
      ) {
        return this.requireActiveByTenantAndMobile(tenantId, mobileDigits);
      }
      throw error;
    }
  }

  /** Create a zero-credit active customer only after the mobile OTP has been verified. */
  async ensureVerifiedStorefrontCustomer(
    tenantId: string,
    mobileDigits: string,
  ): Promise<Customer> {
    const existing = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (existing) {
      if (existing.status !== CustomerStatus.ACTIVE) {
        throw new ForbiddenException('This retailer account is not active.');
      }
      return existing;
    }

    try {
      return await this.customersRepo.save(
        this.customersRepo.create({
          tenantId,
          name: `Retailer ${mobileDigits.slice(-4)}`,
          mobile: mobileDigits,
          email: null,
          status: CustomerStatus.ACTIVE,
          creditLimit: '0.00',
          creditBalance: '0.00',
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        return this.requireActiveByTenantAndMobile(tenantId, mobileDigits);
      }
      throw error;
    }
  }

  async ensureDevTestCustomer(
    tenantId: string,
    mobileDigits: string,
  ): Promise<Customer> {
    const existing = await this.customersRepo.findOne({
      where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
    });
    if (existing) {
      if (existing.status !== CustomerStatus.ACTIVE) {
        existing.status = CustomerStatus.ACTIVE;
        return this.customersRepo.save(existing);
      }
      return existing;
    }

    try {
      const developmentCreditLimit = toMoneyString(
        process.env.STOREFRONT_TEST_CUSTOMER_CREDIT_LIMIT,
        '50000.00',
      );
      return await this.customersRepo.save(
        this.customersRepo.create({
          tenantId,
          name: 'Storefront Test Customer',
          mobile: mobileDigits,
          email: null,
          status: CustomerStatus.ACTIVE,
          creditLimit: developmentCreditLimit,
          creditBalance: '0.00',
        }),
      );
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        const row = await this.customersRepo.findOne({
          where: { tenantId, mobile: mobileDigits, deletedAt: IsNull() },
        });
        if (row) return row;
      }
      throw e;
    }
  }

  /**
   * Call from order/checkout when `customer_id` is known.
   * @throws BadRequestException `Credit limit exceeded`
   */
  async assertCanPlaceOrder(
    tenantId: string,
    customerId: string,
    orderTotal: string,
  ): Promise<void> {
    await this.customersCreditService.checkCustomerCredit(
      tenantId,
      customerId,
      orderTotal,
    );
  }

  /** Alias for modules that prefer this name (same guard as `assertCanPlaceOrder`). */
  async checkCustomerCredit(
    tenantId: string,
    customerId: string,
    orderAmount: string,
  ): Promise<void> {
    await this.customersCreditService.checkCustomerCredit(
      tenantId,
      customerId,
      orderAmount,
    );
  }

  async addCreditLimit(
    actor: JwtUserPayload,
    customerId: string,
    amount: string,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);
    const updated = await this.customersCreditService.increaseCreditLimit(
      c.tenantId,
      customerId,
      amount,
    );
    return { success: true, data: updated, meta: {}, message: '' };
  }

  async applyCreditPayment(
    actor: JwtUserPayload,
    customerId: string,
    amount: string,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);
    const updated =
      await this.customersCreditService.reduceCreditBalanceForPayment(
        c.tenantId,
        customerId,
        amount,
        actor.sub,
      );
    return { success: true, data: updated, meta: {}, message: '' };
  }

  async list(actor: JwtUserPayload, query: CustomerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.customersRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (PLATFORM_ROLES.includes(actor.role)) {
      if (query.tenantId)
        qb.andWhere('c.tenant_id = :tenantId', { tenantId: query.tenantId });
    } else {
      if (!actor.tenantId)
        throw new ForbiddenException('Tenant context required.');
      qb.andWhere('c.tenant_id = :tenantId', { tenantId: actor.tenantId });
    }

    if (query.search?.trim()) {
      const term = `%${query.search.trim().replace(/%/g, '\\%')}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('c.name ILIKE :term', { term })
            .orWhere('c.mobile ILIKE :term', { term });
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      success: true,
      data,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      message: '',
    };
  }

  async getById(actor: JwtUserPayload, id: string) {
    const c = await this.customersRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { addresses: true },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureTenantRead(actor, c.tenantId);
    const wa = await this.waPermRepo.findOne({ where: { customerId: id } });
    const data = Object.assign({}, c, {
      whatsappPermissions: wa ? this.toWhatsappPermissionsDto(wa) : null,
    });
    return { success: true, data, meta: {}, message: '' };
  }

  async getWhatsappPermissions(actor: JwtUserPayload, customerId: string) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureTenantRead(actor, c.tenantId);
    let row = await this.waPermRepo.findOne({ where: { customerId } });
    if (!row) {
      row = await this.waPermRepo.save(
        this.waPermRepo.create({
          customerId,
          tenantId: c.tenantId,
          canViewStatus: true,
          canViewInvoice: true,
          canPlaceOrder: false,
          canRepeatOrder: false,
          canViewCredit: false,
          canReceiveBroadcast: false,
        }),
      );
    }
    return {
      success: true,
      data: this.toWhatsappPermissionsDto(row),
      meta: {},
      message: '',
    };
  }

  async updateWhatsappPermissions(
    actor: JwtUserPayload,
    customerId: string,
    dto: PatchCustomerWhatsappPermissionsDto,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);
    let row = await this.waPermRepo.findOne({ where: { customerId } });
    if (!row) {
      row = this.waPermRepo.create({
        customerId,
        tenantId: c.tenantId,
        canViewStatus: true,
        canViewInvoice: true,
        canPlaceOrder: false,
        canRepeatOrder: false,
        canViewCredit: false,
        canReceiveBroadcast: false,
      });
    }
    if (dto.canViewStatus !== undefined) row.canViewStatus = dto.canViewStatus;
    if (dto.canViewInvoice !== undefined)
      row.canViewInvoice = dto.canViewInvoice;
    if (dto.canPlaceOrder !== undefined) row.canPlaceOrder = dto.canPlaceOrder;
    if (dto.canRepeatOrder !== undefined)
      row.canRepeatOrder = dto.canRepeatOrder;
    if (dto.canViewCredit !== undefined) row.canViewCredit = dto.canViewCredit;
    if (dto.canReceiveBroadcast !== undefined)
      row.canReceiveBroadcast = dto.canReceiveBroadcast;
    row.tenantId = c.tenantId;
    const saved = await this.waPermRepo.save(row);
    return {
      success: true,
      data: this.toWhatsappPermissionsDto(saved),
      meta: {},
      message: '',
    };
  }

  async bulkUpdateWhatsappPermissions(
    actor: JwtUserPayload,
    dto: BulkCustomerWhatsappPermissionsDto,
  ) {
    const customers = await this.customersRepo.find({
      where: { id: In(dto.customerIds), deletedAt: IsNull() },
    });
    if (customers.length !== dto.customerIds.length) {
      throw new BadRequestException('One or more customers were not found.');
    }
    const tenantIds = new Set(customers.map((x) => x.tenantId));
    if (tenantIds.size !== 1) {
      throw new BadRequestException(
        'Bulk update requires customers from a single tenant.',
      );
    }
    const tenantId = customers[0]!.tenantId;
    this.ensureCustomerWrite(actor, tenantId);
    if (!PLATFORM_ROLES.includes(actor.role) && actor.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied.');
    }

    const patch: Partial<CustomerWhatsappPermission> = {};
    if (dto.canViewStatus !== undefined)
      patch.canViewStatus = dto.canViewStatus;
    if (dto.canViewInvoice !== undefined)
      patch.canViewInvoice = dto.canViewInvoice;
    if (dto.canPlaceOrder !== undefined)
      patch.canPlaceOrder = dto.canPlaceOrder;
    if (dto.canRepeatOrder !== undefined)
      patch.canRepeatOrder = dto.canRepeatOrder;
    if (dto.canViewCredit !== undefined)
      patch.canViewCredit = dto.canViewCredit;
    if (dto.canReceiveBroadcast !== undefined)
      patch.canReceiveBroadcast = dto.canReceiveBroadcast;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException(
        'Provide at least one permission field to update.',
      );
    }

    for (const cust of customers) {
      let row = await this.waPermRepo.findOne({
        where: { customerId: cust.id },
      });
      if (!row) {
        row = this.waPermRepo.create({
          customerId: cust.id,
          tenantId: cust.tenantId,
          canViewStatus: true,
          canViewInvoice: true,
          canPlaceOrder: false,
          canRepeatOrder: false,
          canViewCredit: false,
          canReceiveBroadcast: false,
        });
      }
      Object.assign(row, patch);
      row.tenantId = cust.tenantId;
      await this.waPermRepo.save(row);
    }

    return {
      success: true,
      data: { updated: customers.length },
      meta: {},
      message: '',
    };
  }

  private toWhatsappPermissionsDto(row: CustomerWhatsappPermission) {
    return {
      customerId: row.customerId,
      tenantId: row.tenantId,
      canViewStatus: row.canViewStatus,
      canViewInvoice: row.canViewInvoice,
      canPlaceOrder: row.canPlaceOrder,
      canRepeatOrder: row.canRepeatOrder,
      canViewCredit: row.canViewCredit,
      canReceiveBroadcast: row.canReceiveBroadcast,
    };
  }

  async create(actor: JwtUserPayload, dto: CreateCustomerDto) {
    const tenantId = this.resolveCustomerTenantId(actor, dto.tenantId);
    const mobile = normalizeCustomerMobile(dto.mobile);
    const creditLimit = toMoneyString(dto.creditLimit, '0.00');
    const creditBalance = toMoneyString(dto.creditBalance, '0.00');
    if (Number(creditBalance) > Number(creditLimit)) {
      throw new BadRequestException(
        'credit_balance cannot exceed credit_limit.',
      );
    }

    const customer = this.customersRepo.create({
      tenantId,
      name: dto.name.trim(),
      mobile,
      email: dto.email?.trim() || null,
      status: dto.status ?? CustomerStatus.ACTIVE,
      creditLimit,
      creditBalance: '0.00',
    });

    try {
      const saved = await this.customersRepo.save(customer);
      if (Number(creditBalance) > 0) {
        await this.creditLedgerService.recordOpeningDebit({
          tenantId,
          customerId: saved.id,
          openingOwed: creditBalance,
          createdBy: actor.sub,
        });
      }
      if (dto.addresses?.length) {
        await this.replaceAddresses(saved.id, dto.addresses);
      }
      await this.waPermRepo.save(
        this.waPermRepo.create({
          customerId: saved.id,
          tenantId,
          canViewStatus: true,
          canViewInvoice: true,
          canPlaceOrder: false,
          canRepeatOrder: false,
          canViewCredit: false,
          canReceiveBroadcast: false,
        }),
      );
      const full = await this.customersRepo.findOne({
        where: { id: saved.id },
        relations: { addresses: true },
      });
      return { success: true, data: full, meta: {}, message: '' };
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        throw new ConflictException(
          'A customer with this mobile already exists for this store.',
        );
      }
      throw e;
    }
  }

  async update(actor: JwtUserPayload, id: string, dto: UpdateCustomerDto) {
    const c = await this.customersRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);

    if (dto.name !== undefined) c.name = dto.name.trim();
    if (dto.mobile !== undefined)
      c.mobile = normalizeCustomerMobile(dto.mobile);
    if (dto.email !== undefined) {
      const e = dto.email.trim();
      c.email = e.length === 0 ? null : e;
    }
    if (dto.status !== undefined) c.status = dto.status;
    if (dto.creditLimit !== undefined)
      c.creditLimit = toMoneyString(dto.creditLimit);
    if (dto.creditBalance !== undefined) {
      const newB = toMoneyString(dto.creditBalance);
      const oldB = Number(c.creditBalance);
      const delta = Number(newB) - oldB;
      if (Math.abs(delta) > 1e-9) {
        if (delta > 0) {
          await this.creditLedgerService.recordDistributorAdjustment({
            tenantId: c.tenantId,
            customerId: c.id,
            entryType: CreditLedgerTransactionType.ADJUSTMENT_DEBIT,
            magnitude: delta.toFixed(2),
            createdBy: actor.sub,
          });
        } else {
          await this.creditLedgerService.recordDistributorAdjustment({
            tenantId: c.tenantId,
            customerId: c.id,
            entryType: CreditLedgerTransactionType.ADJUSTMENT_CREDIT,
            magnitude: Math.abs(delta).toFixed(2),
            createdBy: actor.sub,
          });
        }
      }
      const refreshed = await this.customersRepo.findOne({
        where: { id: c.id, deletedAt: IsNull() },
      });
      if (refreshed) Object.assign(c, refreshed);
    }

    if (Number(c.creditBalance) > Number(c.creditLimit)) {
      throw new BadRequestException(
        'credit_balance cannot exceed credit_limit.',
      );
    }

    try {
      await this.customersRepo.save(c);
      if (dto.addresses !== undefined) {
        await this.addressesRepo.delete({ customerId: c.id });
        if (dto.addresses.length)
          await this.replaceAddresses(c.id, dto.addresses);
      }
      const full = await this.customersRepo.findOne({
        where: { id: c.id },
        relations: { addresses: true },
      });
      return { success: true, data: full, meta: {}, message: '' };
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        throw new ConflictException(
          'A customer with this mobile already exists for this store.',
        );
      }
      throw e;
    }
  }

  async listCreditLedgerMismatches(take: number) {
    const data =
      await this.creditLedgerService.findLedgerBalanceMismatches(take);
    return { success: true, data, meta: { take }, message: '' };
  }

  async listCreditLedger(
    actor: JwtUserPayload,
    customerId: string,
    query: CustomerCreditLedgerQueryDto,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    if (actor.role === UserRole.CUSTOMER) {
      if (!actor.customerId || actor.customerId !== customerId) {
        throw new ForbiddenException(
          'You can only view your own credit ledger.',
        );
      }
    } else {
      this.ensureTenantRead(actor, c.tenantId);
    }
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const { data, total } = await this.creditLedgerService.listForCustomer(
      c.tenantId,
      customerId,
      page,
      limit,
    );
    return {
      success: true,
      data,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      message: '',
    };
  }

  async applyWriteOff(
    actor: JwtUserPayload,
    customerId: string,
    amount: string,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);
    await this.creditLedgerService.recordWriteOff({
      tenantId: c.tenantId,
      customerId: c.id,
      amount: toMoneyString(amount),
      createdBy: actor.sub,
    });
    const full = await this.customersRepo.findOne({
      where: { id: c.id },
      relations: { addresses: true },
    });
    return { success: true, data: full, meta: {}, message: '' };
  }

  async applyCreditAdjust(
    actor: JwtUserPayload,
    customerId: string,
    dto: CustomerCreditAdjustDto,
  ) {
    const c = await this.customersRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId);
    const entryType =
      dto.entryType === 'ADJUSTMENT_DEBIT'
        ? CreditLedgerTransactionType.ADJUSTMENT_DEBIT
        : CreditLedgerTransactionType.ADJUSTMENT_CREDIT;
    await this.creditLedgerService.recordDistributorAdjustment({
      tenantId: c.tenantId,
      customerId: c.id,
      entryType,
      magnitude: toMoneyString(dto.magnitude),
      createdBy: actor.sub,
    });
    const full = await this.customersRepo.findOne({
      where: { id: c.id },
      relations: { addresses: true },
    });
    return { success: true, data: full, meta: {}, message: '' };
  }

  async remove(actor: JwtUserPayload, id: string) {
    const c = await this.customersRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!c) throw new NotFoundException('Customer not found.');
    this.ensureCustomerWrite(actor, c.tenantId, true);
    await this.customersRepo.softDelete({ id });
    return { success: true, data: { deleted: true }, meta: {}, message: '' };
  }

  private resolveCustomerTenantId(
    actor: JwtUserPayload,
    dtoTenantId?: string,
  ): string {
    if (PLATFORM_ROLES.includes(actor.role)) {
      if (!dtoTenantId)
        throw new BadRequestException(
          'tenantId is required for platform users.',
        );
      return dtoTenantId;
    }
    if (!actor.tenantId)
      throw new ForbiddenException('Tenant context required.');
    if (dtoTenantId && dtoTenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot write into another tenant.');
    }
    return actor.tenantId;
  }

  private ensureTenantRead(actor: JwtUserPayload, recordTenantId: string) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId || actor.tenantId !== recordTenantId) {
      throw new ForbiddenException('Access denied.');
    }
  }

  private ensureCustomerWrite(
    actor: JwtUserPayload,
    recordTenantId: string,
    isDelete = false,
  ) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId || actor.tenantId !== recordTenantId) {
      throw new ForbiddenException('Cross-tenant write access denied.');
    }
    if (isDelete && actor.role === UserRole.STAFF) {
      throw new ForbiddenException('STAFF cannot delete customers.');
    }
  }

  private async replaceAddresses(
    customerId: string,
    rows: CustomerAddressInputDto[],
  ): Promise<void> {
    let defaultSeen = false;
    const entities = rows.map((a, i) => {
      const isDefault = a.isDefault === true || (!defaultSeen && i === 0);
      if (isDefault) defaultSeen = true;
      return this.addressesRepo.create({
        customerId,
        label: a.label?.trim() || null,
        line1: a.line1.trim(),
        line2: a.line2?.trim() || null,
        city: a.city.trim(),
        state: a.state.trim(),
        pincode: a.pincode.trim(),
        countryCode: a.countryCode?.toUpperCase() ?? null,
        isDefault,
      });
    });
    await this.addressesRepo.save(entities);
  }
}
