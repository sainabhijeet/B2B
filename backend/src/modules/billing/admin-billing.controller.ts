import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { BillingService } from './billing.service';
import { AdminMarkPaymentDto } from './dto/admin-mark-payment.dto';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Billing Admin')
@ApiBearerAuth('bearer')
export class AdminBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscriptions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  listSubscriptions() {
    return this.billingService.adminSubscriptions();
  }

  @Get('payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  listPayments() {
    return this.billingService.adminPayments();
  }

  @Patch('subscriptions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBody({
    type: AdminUpdateSubscriptionDto,
    examples: {
      extend: {
        summary: 'Extend subscription end date',
        value: {
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          action: 'EXTEND',
          endDate: '2026-12-31',
        },
      },
      cancel: {
        summary: 'Cancel subscription',
        value: {
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          action: 'CANCEL',
        },
      },
    },
  })
  updateSubscription(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AdminUpdateSubscriptionDto,
  ) {
    return this.billingService.adminUpdateSubscription(user, dto);
  }

  @Post('payments/mark')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBody({
    type: AdminMarkPaymentDto,
    examples: {
      markPaid: {
        summary: 'Mark a SaaS payment as success (triggers referral commission like Razorpay success)',
        value: {
          paymentId: '44444444-4444-4444-8444-444444444444',
          paymentStatus: 'SUCCESS',
        },
      },
    },
  })
  markPayment(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AdminMarkPaymentDto,
  ) {
    return this.billingService.adminMarkPayment(user, dto);
  }
}
