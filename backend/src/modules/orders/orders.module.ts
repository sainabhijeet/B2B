import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { User } from '../../common/entities/user.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { CartModule } from '../cart/cart.module';
import { CustomersModule } from '../customers/customers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { UsersModule } from '../users/users.module';
import { CouponsModule } from '../coupons/coupons.module';
import { RazorpayIntegration } from '../../integrations/razorpay/razorpay.integration';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TenancyModule,
    TypeOrmModule.forFeature([SystemConfig, User]),
    CartModule,
    CouponsModule,
    CustomersModule,
    InvoicesModule,
    UsersModule,
    AuditLogsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, RazorpayIntegration],
  exports: [OrdersService],
})
export class OrdersModule {}
