import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BillingService } from './billing.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { SubscribePlanDto } from './dto/subscribe-plan.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Billing')
@ApiBearerAuth('bearer')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  getPlans() {
    return this.billingService.getPlans();
  }

  @Post('subscribe')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBody({
    type: SubscribePlanDto,
    examples: {
      upgrade: {
        summary: 'Subscribe tenant to a plan (use plan id from GET /billing/plans)',
        value: {
          planId: '11111111-1111-4111-8111-111111111111',
          tenantId: '22222222-2222-4222-8222-222222222222',
        },
      },
    },
  })
  subscribe(@CurrentUser() user: JwtUserPayload, @Body() dto: SubscribePlanDto) {
    return this.billingService.subscribe(user, dto);
  }

  @Get('subscription')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  subscription(@CurrentUser() user: JwtUserPayload) {
    return this.billingService.getTenantSubscription(user);
  }

  @Post('payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBody({
    type: CreatePaymentDto,
    examples: {
      bankTransfer: {
        summary: 'Submit a pending manual SaaS payment for platform verification',
        value: {
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          tenantId: '22222222-2222-4222-8222-222222222222',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-REF-001',
        },
      },
    },
  })
  createPayment(@CurrentUser() user: JwtUserPayload, @Body() dto: CreatePaymentDto) {
    return this.billingService.createPayment(user, dto);
  }

  /** Platform SaaS subscription payment via Razorpay (tenant pays you). Storefront order payments stay manual. */
  @Post('payments/razorpay/create-order')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  @ApiBody({
    type: CreateRazorpayOrderDto,
    examples: {
      checkout: {
        summary: 'Create Razorpay order for subscription checkout',
        value: {
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          tenantId: '22222222-2222-4222-8222-222222222222',
        },
      },
    },
  })
  createRazorpayOrder(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateRazorpayOrderDto) {
    return this.billingService.createRazorpayOrder(user, dto);
  }

  @Post('payments/razorpay/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  @ApiBody({
    type: VerifyRazorpayPaymentDto,
    examples: {
      afterCheckout: {
        summary: 'Verify payment after Razorpay Checkout (client returns orderId, paymentId, signature)',
        value: {
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          tenantId: '22222222-2222-4222-8222-222222222222',
          razorpayOrderId: 'order_ABC123',
          razorpayPaymentId: 'pay_XYZ789',
          razorpaySignature: 'server_generated_hmac_from_razorpay',
        },
      },
    },
  })
  verifyRazorpayPayment(@CurrentUser() user: JwtUserPayload, @Body() dto: VerifyRazorpayPaymentDto) {
    return this.billingService.verifyRazorpayPayment(user, dto);
  }

  @Post('invoices/generate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  generateInvoice(@CurrentUser() user: JwtUserPayload, @Query('tenantId') tenantId?: string) {
    return this.billingService.generateInvoice(user, tenantId);
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER, UserRole.MANAGER)
  dashboard(@CurrentUser() user: JwtUserPayload) {
    return this.billingService.dashboard(user);
  }
}
