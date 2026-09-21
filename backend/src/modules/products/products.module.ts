import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { Attribute } from '../../common/entities/attribute.entity';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { Category } from '../../common/entities/category.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { ProductCategory } from '../../common/entities/product-category.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ProductVariantAttributeValue } from '../../common/entities/product-variant-attribute-value.entity';
import { Product } from '../../common/entities/product.entity';
import { PlanLimit } from '../../common/entities/plan-limit.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { TopProduct } from '../../common/entities/top-product.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard';
import { CatalogTopProductsController } from './catalog-top-products.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TopProductsService } from './top-products.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { BrandsModule } from '../brands/brands.module';
import { StockAlertsModule } from '../stock-alerts/stock-alerts.module';

@Module({
  imports: [
    TenancyModule,
    BrandsModule,
    SubscriptionsModule,
    StockAlertsModule,
    TypeOrmModule.forFeature([
      Product,
      Category,
      ProductVariant,
      ProductImage,
      Inventory,
      CatalogAuditLog,
      Attribute,
      AttributeValue,
      ProductCategory,
      ProductVariantAttributeValue,
      SystemConfig,
      Subscription,
      PlanLimit,
      TopProduct,
      TenantProfile,
    ]),
  ],
  controllers: [ProductsController, CatalogTopProductsController],
  providers: [ProductsService, TopProductsService, PlanLimitGuard],
  exports: [ProductsService, TopProductsService],
})
export class ProductsModule {}
