import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogPricingModule } from '../catalog-pricing/catalog-pricing.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { ThemesModule } from '../themes/themes.module';
import { TranslationsModule } from '../translations/translations.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { Category } from '../../common/entities/category.entity';
import { GuestCartLine } from '../../common/entities/guest-cart-line.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { StorefrontAppConfigController } from './storefront-app-config.controller';
import { StorefrontCategoriesController } from './storefront-categories.controller';
import { StorefrontCategoriesService } from './storefront-categories.service';
import { StorefrontGuestCartController } from './storefront-guest-cart.controller';
import { StorefrontGuestCartService } from './storefront-guest-cart.service';
import { StorefrontProductsController } from './storefront-products.controller';
import { StorefrontProductsService } from './storefront-products.service';

@Module({
  imports: [
    TenancyModule,
    AppConfigModule,
    ThemesModule,
    TranslationsModule,
    CatalogPricingModule,
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      Category,
      ProductImage,
      Inventory,
      AttributeValue,
      GuestCartLine,
      TenantProfile,
      TenantOnboarding,
    ]),
  ],
  controllers: [
    StorefrontAppConfigController,
    StorefrontGuestCartController,
    StorefrontProductsController,
    StorefrontCategoriesController,
  ],
  providers: [
    StorefrontProductsService,
    StorefrontCategoriesService,
    StorefrontGuestCartService,
  ],
  exports: [StorefrontProductsService, StorefrontCategoriesService],
})
export class StorefrontProductsModule {}
