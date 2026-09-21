import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceSetting } from '../../common/entities/invoice-setting.entity';
import { TenantInvoiceCounter } from '../../common/entities/tenant-invoice-counter.entity';
import { User } from '../../common/entities/user.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TenancyModule,
    TypeOrmModule.forFeature([InvoiceSetting, TenantInvoiceCounter, User]),
    NotificationsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoiceNumberService, InvoicesService],
  exports: [InvoiceNumberService, InvoicesService],
})
export class InvoicesModule {}
