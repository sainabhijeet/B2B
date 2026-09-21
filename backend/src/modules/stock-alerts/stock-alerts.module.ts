import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAlertSubscription } from '../../common/entities/stock-alert-subscription.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { StockAlertsController } from './stock-alerts.controller';
import { StockAlertsService } from './stock-alerts.service';

@Module({
  imports: [TenancyModule, TypeOrmModule.forFeature([StockAlertSubscription])],
  controllers: [StockAlertsController],
  providers: [StockAlertsService],
  exports: [StockAlertsService],
})
export class StockAlertsModule {}
