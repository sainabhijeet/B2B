import { AuditLog } from './audit-log.entity';
import { AdminModuleState } from './admin-module-state.entity';
import { AdminMediaFile } from './admin-media-file.entity';
import { ApiRequestLog } from './api-request-log.entity';
import { Attribute } from './attribute.entity';
import { AttributeValue } from './attribute-value.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { Ad } from './ad.entity';
import { AdCampaign } from './ad-campaign.entity';
import { AdCreative } from './ad-creative.entity';
import { AdStat } from './ad-stat.entity';
import { AiSettings } from './ai-settings.entity';
import { AppVersion } from './app-version.entity';
import { CatalogAuditLog } from './catalog-audit-log.entity';
import { Category } from './category.entity';
import { Country } from './country.entity';
import { CreditTransaction } from './credit-transaction.entity';
import { CouponRedemption } from './coupon-redemption.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerGroupMap } from './customer-group-map.entity';
import { CustomerGroup } from './customer-group.entity';
import { CustomerPrice } from './customer-price.entity';
import { Customer } from './customer.entity';
import { CartItem } from './cart-item.entity';
import { Cart } from './cart.entity';
import { BuildArtifact } from './build-artifact.entity';
import { BuildLog } from './build-log.entity';
import { BuildMetric } from './build-metric.entity';
import { BuildJob } from './build-job.entity';
import { BillingInvoice } from './billing-invoice.entity';
import { Brand } from './brand.entity';
import { Inventory } from './inventory.entity';
import { Industry } from './industry.entity';
import { FailedJob } from './failed-job.entity';
import { GroupPrice } from './group-price.entity';
import { GeoCity } from './geo-city.entity';
import { GeoPincode } from './geo-pincode.entity';
import { GeoState } from './geo-state.entity';
import { GuestCartLine } from './guest-cart-line.entity';
import { InvoiceSetting } from './invoice-setting.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Invoice } from './invoice.entity';
import { MasterBrand } from './master-brand.entity';
import { MobileRelease } from './mobile-release.entity';
import { MobileReleaseEvent } from './mobile-release-event.entity';
import { MobileReleaseSettings } from './mobile-release-settings.entity';
import { OtpChallenge } from './otp-challenge.entity';
import { Notification } from './notification.entity';
import { OrderItem } from './order-item.entity';
import { OrderPayment } from './order-payment.entity';
import { OrderRequest } from './order-request.entity';
import { ReplacementShipment } from './replacement-shipment.entity';
import { Order } from './order.entity';
import { CustomerWhatsappPermission } from './customer-whatsapp-permission.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { PlatformWhatsappNumber } from './platform-whatsapp-number.entity';
import { Plan } from './plan.entity';
import { PlanLimit } from './plan-limit.entity';
import { ProductImage } from './product-image.entity';
import { ProductCategory } from './product-category.entity';
import { QuantityPrice } from './quantity-price.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
import { Product } from './product.entity';
import { Payment } from './payment.entity';
import { RefreshToken } from './refresh-token.entity';
import { ReferralCode } from './referral-code.entity';
import { ReferralCommission } from './referral-commission.entity';
import { ReferralConversion } from './referral-conversion.entity';
import { ReferralSetting } from './referral-setting.entity';
import { SystemConfig } from './system-config.entity';
import { Subscription } from './subscription.entity';
import { StockAlertSubscription } from './stock-alert-subscription.entity';
import { SupportTicket } from './support-ticket.entity';
import { TenantWhatsappMenu } from './tenant-whatsapp-menu.entity';
import { Tenant } from './tenant.entity';
import { TenantCoupon } from './tenant-coupon.entity';
import { TenantAppSettings } from './tenant-app-settings.entity';
import { TenantBranding } from './tenant-branding.entity';
import { TenantDistributorApp } from './tenant-app.entity';
import { TenantDomain } from './tenant-domain.entity';
import { TenantOnboarding } from './tenant-onboarding.entity';
import { TenantProfile } from './tenant-profile.entity';
import { TenantPushConfig } from './tenant-push-config.entity';
import { TenantSection } from './tenant-section.entity';
import { TenantTheme } from './tenant-theme.entity';
import { TenantThemeChange } from './tenant-theme-change.entity';
import { TenantThemeSettings } from './tenant-theme-settings.entity';
import { TenantInvoiceCounter } from './tenant-invoice-counter.entity';
import { TenantThemeToken } from './tenant-theme-token.entity';
import { TempCustomer } from './temp-customer.entity';
import { Theme } from './theme.entity';
import { ThemeComboMapping } from './theme-combo-mapping.entity';
import { ThemePreviewImage } from './theme-preview-image.entity';
import { Translation } from './translation.entity';
import { User } from './user.entity';
import { UserDeviceToken } from './user-device-token.entity';
import { WorkerNode } from './worker-node.entity';
import { WorkerLog } from './worker-log.entity';
import { WhatsappMessageTemplate } from './whatsapp-message-template.entity';
import {
  WhatsappMessage,
  WhatsappOrderSession,
} from '../../modules/whatsapp/entities';

export {
  WhatsappMessage,
  WhatsappOrderSession,
} from '../../modules/whatsapp/entities';

export const APP_ENTITIES = [
  AdminModuleState,
  AdminMediaFile,
  ApiRequestLog,
  AuditLog,
  AnalyticsEvent,
  Ad,
  AdCampaign,
  AdCreative,
  AdStat,
  AiSettings,
  AppVersion,
  CatalogAuditLog,
  Category,
  Country,
  Customer,
  CreditTransaction,
  CouponRedemption,
  CustomerAddress,
  CustomerGroup,
  CustomerGroupMap,
  CustomerPrice,
  CustomerWhatsappPermission,
  Cart,
  CartItem,
  BuildArtifact,
  BuildLog,
  BuildMetric,
  BuildJob,
  BillingInvoice,
  Attribute,
  AttributeValue,
  Product,
  Payment,
  QuantityPrice,
  ProductVariant,
  ProductVariantAttributeValue,
  ProductCategory,
  ProductImage,
  Inventory,
  Industry,
  MasterBrand,
  MobileRelease,
  MobileReleaseEvent,
  MobileReleaseSettings,
  Brand,
  FailedJob,
  GroupPrice,
  GeoCity,
  GeoPincode,
  GeoState,
  GuestCartLine,
  Order,
  OrderItem,
  OrderPayment,
  OrderRequest,
  ReplacementShipment,
  Invoice,
  InvoiceItem,
  InvoiceSetting,
  Plan,
  PlatformWhatsappNumber,
  PlanLimit,
  Subscription,
  StockAlertSubscription,
  SupportTicket,
  Tenant,
  TenantCoupon,
  TenantAppSettings,
  TenantWhatsappMenu,
  TenantBranding,
  TenantDistributorApp,
  TenantDomain,
  TenantInvoiceCounter,
  TenantOnboarding,
  TenantProfile,
  TenantPushConfig,
  TenantSection,
  TenantTheme,
  TenantThemeChange,
  TenantThemeSettings,
  TenantThemeToken,
  TempCustomer,
  Theme,
  ThemeComboMapping,
  ThemePreviewImage,
  Translation,
  User,
  UserDeviceToken,
  WorkerNode,
  RefreshToken,
  ReferralCode,
  ReferralCommission,
  ReferralConversion,
  ReferralSetting,
  OtpChallenge,
  Notification,
  PasswordResetToken,
  SystemConfig,
  WorkerLog,
  WhatsappMessage,
  WhatsappMessageTemplate,
  WhatsappOrderSession,
];
