import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AuthService } from './auth.service';
import { DeleteStorefrontCustomerAccountDto } from './dto/delete-storefront-customer-account.dto';
import { StorefrontCustomerLoginDto } from './dto/storefront-customer-login.dto';
import { StorefrontCustomerRegisterDto } from './dto/storefront-customer-register.dto';
import { StorefrontCustomerVerifyDto } from './dto/storefront-customer-verify.dto';
import { CustomersService } from '../customers/customers.service';
import { CustomerAddressInputDto } from '../customers/dto/customer-address-input.dto';
import { CustomerCreditLedgerQueryDto } from '../customers/dto/customer-credit-ledger-query.dto';
import { StorefrontCustomerProfileUpdateDto } from '../customers/dto/storefront-customer-profile-update.dto';

const CUSTOMER_AVATAR_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
const GST_CERTIFICATE_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024;

@Controller('storefront/customer')
@ApiTags('Storefront Customer')
export class StorefrontCustomerController {
  constructor(
    private readonly authService: AuthService,
    private readonly customersService: CustomersService,
  ) {}

  private resolveTenantId(req: Request & { tenantId?: string | null }): string {
    const tid = req.tenantId ?? null;
    if (!tid) {
      throw new BadRequestException(
        'Store tenant context missing. Use storefront host, X-Storefront-Host, or X-Tenant-Id.',
      );
    }
    return tid;
  }

  /** Creates an inactive retailer account for distributor approval. */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() dto: StorefrontCustomerRegisterDto,
    @Req() req: Request & { tenantId?: string | null },
  ) {
    return this.customersService.registerFromStorefront(
      this.resolveTenantId(req),
      dto,
    );
  }

  /** Sends OTP if `customers` row exists for this store + mobile. */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestOtp(@Body() dto: StorefrontCustomerLoginDto, @Req() req: Request & { tenantId?: string | null }) {
    return this.authService.storefrontCustomerRequestLoginOtp(this.resolveTenantId(req), dto.mobile);
  }

  /** Verifies OTP and returns access + refresh tokens (same as `auth/verify-otp` customer_tenant). */
  @Post('verify-otp')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  verifyOtp(@Body() dto: StorefrontCustomerVerifyDto, @Req() req: Request & { tenantId?: string | null }) {
    return this.authService.storefrontCustomerVerifyOtpAndLogin(
      this.resolveTenantId(req),
      dto.mobile,
      dto.code,
      dto.deviceId,
    );
  }

  /** Authenticated retailer profile (credit limits for header / checkout). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  me(@CurrentUser() user: JwtUserPayload) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.profileForStorefrontCustomer(user);
  }

  /** Authenticated retailer credit ledger for mobile storefront. */
  @Get('credit-ledger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  creditLedger(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: CustomerCreditLedgerQueryDto,
  ) {
    if (user.role !== UserRole.CUSTOMER || !user.customerId) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.listCreditLedger(user, user.customerId, query);
  }

  /** Authenticated retailer GST / business verification profile. */
  @Get('business')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  business(@CurrentUser() user: JwtUserPayload) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.businessProfileForStorefrontCustomer(user);
  }

  /** Saves GST details without external GST API verification. */
  @Patch('business')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  updateBusiness(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { companyLegalName?: string; gstin?: string },
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.updateBusinessProfileForStorefrontCustomer(user, dto);
  }

  /** Uploads GST certificate PDF/image and verifies it without third-party APIs. */
  @Post('business/certificate')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('certificate', {
      storage: memoryStorage(),
      limits: { fileSize: GST_CERTIFICATE_UPLOAD_LIMIT_BYTES },
    }),
  )
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  uploadBusinessCertificate(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { companyLegalName?: string; gstin?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.uploadBusinessCertificateForStorefrontCustomer(user, dto, file);
  }

  /** Updates authenticated retailer profile fields. */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  updateMe(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: StorefrontCustomerProfileUpdateDto,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.updateStorefrontCustomerProfile(user, dto);
  }

  /** Requests an OTP before irreversible storefront account deletion. */
  @Post('account-deletion/otp')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiBearerAuth('bearer')
  requestAccountDeletionOtp(@CurrentUser() user: JwtUserPayload) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.authService.storefrontCustomerRequestAccountDeletionOtp(user);
  }

  /** Soft-deletes the authenticated customer account after OTP confirmation. */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth('bearer')
  deleteMe(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: DeleteStorefrontCustomerAccountDto,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.authService.storefrontCustomerDeleteAccount(user, dto);
  }

  /** Uploads authenticated retailer profile photo. */
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CUSTOMER_AVATAR_UPLOAD_LIMIT_BYTES },
    }),
  )
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  uploadAvatar(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.uploadStorefrontCustomerProfileImage(user, file);
  }

  /** Adds a storefront customer delivery address. */
  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  addAddress(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CustomerAddressInputDto,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.addAddressForStorefrontCustomer(user, dto);
  }

  /** Updates a storefront customer delivery address. */
  @Patch('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  updateAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: CustomerAddressInputDto,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.updateAddressForStorefrontCustomer(user, id, dto);
  }

  /** Marks a storefront customer delivery address as default. */
  @Post('addresses/:id/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  setDefaultAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.setDefaultAddressForStorefrontCustomer(user, id);
  }

  /** Deletes a storefront customer delivery address. */
  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  deleteAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('This endpoint is for storefront customers only.');
    }
    return this.customersService.deleteAddressForStorefrontCustomer(user, id);
  }
}
