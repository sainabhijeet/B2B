import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditTransaction } from '../../common/entities/credit-transaction.entity';
import { CustomerAddress } from '../../common/entities/customer-address.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerWhatsappPermission } from '../../common/entities/customer-whatsapp-permission.entity';
import { CreditLedgerService } from './credit-ledger.service';
import { CustomersCreditService } from './customers-credit.service';
import { ReorderSuggestionsModule } from '../reorder-suggestions/reorder-suggestions.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { PlatformStorageProvidersModule } from '../storage-providers/platform-storage-providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerAddress,
      CreditTransaction,
      CustomerWhatsappPermission,
      StorageObject,
    ]),
    ReorderSuggestionsModule,
    TenancyModule,
    NotificationsModule,
    PlatformStorageProvidersModule,
  ],
  controllers: [CustomersController],
  providers: [CreditLedgerService, CustomersCreditService, CustomersService],
  exports: [CreditLedgerService, CustomersCreditService, CustomersService],
})
export class CustomersModule {}
