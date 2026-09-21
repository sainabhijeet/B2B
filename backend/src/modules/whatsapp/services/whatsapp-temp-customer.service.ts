import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { Customer } from '../../../common/entities/customer.entity';
import { CustomerWhatsappPermission } from '../../../common/entities/customer-whatsapp-permission.entity';
import { TempCustomer } from '../../../common/entities/temp-customer.entity';
import { CustomerStatus } from '../../../common/enums/customer-status.enum';
import { normalizeCustomerMobile } from '../../../common/utils/phone-normalize.util';
import { WhatsappOrderSession } from '../entities/whatsapp-order-session.entity';

@Injectable()
export class WhatsappTempCustomerService {
  private readonly log = new Logger(WhatsappTempCustomerService.name);

  constructor(
    @InjectRepository(TempCustomer)
    private readonly tempRepo: Repository<TempCustomer>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerWhatsappPermission)
    private readonly permRepo: Repository<CustomerWhatsappPermission>,
    @InjectRepository(WhatsappOrderSession)
    private readonly sessionRepo: Repository<WhatsappOrderSession>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private pickCanonicalWhatsappMobile(from: string): string | null {
    const d = from.replace(/\D/g, '');
    if (d.length < 8 || d.length > 20) return null;
    const core = d.length > 10 ? d.slice(-10) : d;
    try {
      return normalizeCustomerMobile(core);
    } catch {
      return null;
    }
  }

  /**
   * Persist a WhatsApp lead in `temp_customers` until their first order is confirmed
   * (then {@link promoteToCustomerForSession} moves them to `customers`).
   */
  async findOrCreateFromWaFrom(tenantId: string, from: string): Promise<TempCustomer | null> {
    const mobile = this.pickCanonicalWhatsappMobile(from);
    if (!mobile) {
      this.log.warn(`findOrCreateFromWaFrom: invalid WhatsApp from=${from}`);
      return null;
    }
    const existing = await this.tempRepo.findOne({ where: { tenantId, mobile } });
    if (existing) return existing;

    const name = `WhatsApp ${mobile.slice(-4)}`;
    const row = this.tempRepo.create({ tenantId, mobile, name });
    try {
      return await this.tempRepo.save(row);
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        return this.tempRepo.findOne({ where: { tenantId, mobile } });
      }
      this.log.error(
        `findOrCreateFromWaFrom failed tenant_id=${tenantId} mobile=${mobile}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  /**
   * Creates or reuses `customers` row, repoints the WhatsApp session, removes the temp lead.
   */
  async promoteToCustomerForSession(
    tenantId: string,
    tempCustomerId: string,
    sessionId: string,
  ): Promise<string> {
    return this.dataSource.transaction(async (em) => {
      await em.query(`SELECT id FROM temp_customers WHERE id = $1 FOR UPDATE`, [tempCustomerId]);

      const temp = await em.findOne(TempCustomer, { where: { id: tempCustomerId, tenantId } });
      if (!temp) {
        throw new BadRequestException('Temporary customer not found.');
      }

      let customer = await em.findOne(Customer, {
        where: { tenantId, mobile: temp.mobile, deletedAt: IsNull() },
      });
      if (!customer) {
        customer = em.create(Customer, {
          tenantId,
          name: temp.name,
          mobile: temp.mobile,
          email: null,
          status: CustomerStatus.ACTIVE,
          creditLimit: '0.00',
          creditBalance: '0.00',
        });
        await em.save(customer);
        await em.save(
          em.create(CustomerWhatsappPermission, {
            customerId: customer.id,
            tenantId,
            canViewStatus: true,
            canViewInvoice: true,
            canPlaceOrder: false,
            canRepeatOrder: false,
            canViewCredit: false,
            canReceiveBroadcast: false,
          }),
        );
      } else {
        const perm = await em.findOne(CustomerWhatsappPermission, {
          where: { customerId: customer.id, tenantId },
        });
        if (!perm) {
          await em.save(
            em.create(CustomerWhatsappPermission, {
              customerId: customer.id,
              tenantId,
              canViewStatus: true,
              canViewInvoice: true,
              canPlaceOrder: false,
              canRepeatOrder: false,
              canViewCredit: false,
              canReceiveBroadcast: false,
            }),
          );
        }
      }

      await em.update(
        WhatsappOrderSession,
        { id: sessionId, tenantId },
        { customerId: customer.id, tempCustomerId: null },
      );

      await em.delete(TempCustomer, { id: temp.id });

      return customer.id;
    });
  }
}
