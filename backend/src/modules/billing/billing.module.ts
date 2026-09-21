import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingInvoice } from '../../common/entities/billing-invoice.entity';
import { Payment } from '../../common/entities/payment.entity';
import { Plan } from '../../common/entities/plan.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { RazorpayIntegration } from '../../integrations/razorpay/razorpay.integration';
import { ReferralsModule } from '../referrals/referrals.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminBillingController } from './admin-billing.controller';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, Payment, BillingInvoice]),
    ReferralsModule,
    AuditLogsModule,
    OrdersModule,
  ],
  providers: [BillingService, RazorpayIntegration],
  controllers: [
    BillingController,
    AdminBillingController,
    BillingWebhookController,
  ],
  exports: [BillingService],
})
export class BillingModule {}
