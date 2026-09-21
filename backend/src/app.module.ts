import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { SecurityModule } from './common/security/security.module';
import { DatabaseModule } from './common/database/database.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UsersModule } from './modules/users/users.module';
import { OtpModule } from './modules/otp/otp.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { BrandsModule } from './modules/brands/brands.module';
import { MasterBrandsModule } from './modules/master-brands/master-brands.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BuildModule } from './build-system/build.module';
import { HealthModule } from './monitoring/health.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ThemesModule } from './modules/themes/themes.module';
import { AdsModule } from './modules/ads/ads.module';
import { VersionsModule } from './modules/versions/versions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StockAlertsModule } from './modules/stock-alerts/stock-alerts.module';
import { SupportModule } from './modules/support/support.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { BillingModule } from './modules/billing/billing.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CountriesModule } from './modules/countries/countries.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { GstModule } from './modules/gst/gst.module';
import { AiSettingsModule } from './modules/ai-settings/ai-settings.module';
import { BrandingModule } from './modules/branding/branding.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { DistributorPanelModule } from './modules/distributor-panel/distributor-panel.module';
import { AppPackageModule } from './modules/app-package/app-package.module';
import { StorefrontProductsModule } from './modules/storefront-products/storefront-products.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { LogoModule } from './modules/logo/logo.module';
import { MobileReleaseModule } from './modules/mobile-release/mobile-release.module';
import { MobileCommerceModule } from './modules/mobile-commerce/mobile-commerce.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { BootstrapService } from './common/services/bootstrap.service';
import { EmailService } from './common/services/email.service';
import { TenancyModule } from './tenancy/tenancy.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { AdminConsoleModule } from './modules/admin-console/admin-console.module';
import { PrivateDocumentsModule } from './modules/private-documents/private-documents.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiRequestLoggingInterceptor } from './common/interceptors/api-request-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', 'backend/.env'],
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    SecurityModule,
    ObservabilityModule,
    DatabaseModule,
    TenancyModule,
    PrivateDocumentsModule,
    RbacModule,
    UsersModule,
    OtpModule,
    AuthModule,
    TenantsModule,
    SystemConfigModule,
    AuditLogsModule,
    CategoriesModule,
    CustomersModule,
    AttributesModule,
    BrandsModule,
    MasterBrandsModule,
    ProductsModule,
    CartModule,
    CouponsModule,
    OrdersModule,
    InvoicesModule,
    SubscriptionsModule,
    ThemesModule,
    AdsModule,
    VersionsModule,
    NotificationsModule,
    StockAlertsModule,
    SupportModule,
    TranslationsModule,
    MonitoringModule,
    BillingModule,
    CountriesModule,
    IndustriesModule,
    LocationsModule,
    ReferralsModule,
    GstModule,
    AiSettingsModule,
    LogoModule,
    BrandingModule,
    AppConfigModule,
    DistributorPanelModule,
    AppPackageModule,
    StorefrontProductsModule,
    WhatsappModule,
    MobileReleaseModule,
    MobileCommerceModule,
    BuildModule,
    HealthModule,
    AdminConsoleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BootstrapService,
    EmailService,
    JwtAuthGuard,
    { provide: APP_INTERCEPTOR, useClass: ApiRequestLoggingInterceptor },
  ],
})
export class AppModule {}
