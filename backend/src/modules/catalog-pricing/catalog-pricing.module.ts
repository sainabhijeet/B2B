import { Module } from '@nestjs/common';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { CatalogPricingController } from './catalog-pricing.controller';
import { CatalogPricingService } from './catalog-pricing.service';
import { VariantPricingService } from './variant-pricing.service';

@Module({
  imports: [TenancyModule],
  controllers: [CatalogPricingController],
  providers: [VariantPricingService, CatalogPricingService],
  exports: [VariantPricingService, CatalogPricingService],
})
export class CatalogPricingModule {}
