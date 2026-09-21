import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { TenantDetailLayout } from '@/components/tenants/TenantDetailLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { SystemActivityLayout } from '@/components/activity/SystemActivityLayout';
import { ActivityFeedPage } from '@/pages/system-activity/ActivityFeedPage';
import { TenantActivityPage } from '@/pages/system-activity/TenantActivityPage';
import { AdminActivityPage } from '@/pages/system-activity/AdminActivityPage';
import { SystemEventsActivityPage } from '@/pages/system-activity/SystemEventsActivityPage';
import { TenantListPage } from '@/pages/tenants/TenantListPage';
import { TenantOverviewTab } from '@/pages/tenants/tabs/TenantOverviewTab';
import { TenantSubscriptionTab } from '@/pages/tenants/tabs/TenantSubscriptionTab';
import { TenantUsageTab } from '@/pages/tenants/tabs/TenantUsageTab';
import { TenantDomainsTab } from '@/pages/tenants/tabs/TenantDomainsTab';
import { TenantBuildsTab } from '@/pages/tenants/tabs/TenantBuildsTab';
import { TenantDatabaseTab } from '@/pages/tenants/tabs/TenantDatabaseTab';
import { TenantFeatureFlagsTab } from '@/pages/tenants/tabs/TenantFeatureFlagsTab';
import { TenantSupportTab } from '@/pages/tenants/tabs/TenantSupportTab';
import { TenantActivityTab } from '@/pages/tenants/tabs/TenantActivityTab';
import { TenantDangerTab } from '@/pages/tenants/tabs/TenantDangerTab';
import { TenantWhatsappTab } from '@/pages/tenants/tabs/TenantWhatsappTab';
import { PlanListPage } from '@/pages/plans/PlanListPage';
import { PlanMatrixPage } from '@/pages/plans/PlanMatrixPage';
import { PlanFormPage } from '@/pages/plans/PlanFormPage';
import { CategoryListPage } from '@/pages/categories/CategoryListPage';
import { CategoryFormPage } from '@/pages/categories/CategoryFormPage';
import { ProductListPage } from '@/pages/products/ProductListPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { AttributeListPage } from '@/pages/attributes/AttributeListPage';
import { AttributeFormPage } from '@/pages/attributes/AttributeFormPage';
import { MasterBrandListPage } from '@/pages/master-brands/MasterBrandListPage';
import { MasterBrandFormPage } from '@/pages/master-brands/MasterBrandFormPage';
import { BuildManagerLayout } from '@/components/build/BuildManagerLayout';
import { BuildDashboardPage } from '@/pages/build/BuildDashboardPage';
import { BuildQueuePage } from '@/pages/build/BuildQueuePage';
import { BuildHistoryPage } from '@/pages/build/BuildHistoryPage';
import { BuildLogsIndexPage } from '@/pages/build/BuildLogsIndexPage';
import { BuildLogsPage } from '@/pages/build/BuildLogsPage';
import { BuildInfrastructurePage } from '@/pages/build/BuildInfrastructurePage';
import { BuildSettingsPage } from '@/pages/build/BuildSettingsPage';
import { ThemeManagerLayout } from '@/components/themes/ThemeManagerLayout';
import { ThemeDashboardPage } from '@/pages/themes/ThemeDashboardPage';
import { ThemeListPage } from '@/pages/themes/ThemeListPage';
import { ThemeUploadPage } from '@/pages/themes/ThemeUploadPage';
import { ThemeEditPage } from '@/pages/themes/ThemeEditPage';
import { ThemePreviewPage } from '@/pages/themes/ThemePreviewPage';
import { ThemeComboPacksPage } from '@/pages/themes/ThemeComboPacksPage';
import { ThemeComboPreviewPage } from '@/pages/themes/ThemeComboPreviewPage';
import { ThemeTranslationReviewPage } from '@/pages/themes/ThemeTranslationReviewPage';
import { AdsManagerLayout } from '@/components/ads/AdsManagerLayout';
import { AdsDashboardPage } from '@/pages/ads/AdsDashboardPage';
import { AdsCampaignsPage } from '@/pages/ads/AdsCampaignsPage';
import { AdsCampaignFormPage } from '@/pages/ads/AdsCampaignFormPage';
import { AdsCreativesPage } from '@/pages/ads/AdsCreativesPage';
import { AdsPlacementsPage } from '@/pages/ads/AdsPlacementsPage';
import { AdsAnalyticsPage } from '@/pages/ads/AdsAnalyticsPage';
import { AdsSettingsPage } from '@/pages/ads/AdsSettingsPage';
import { AnalyticsManagerLayout } from '@/components/analytics/AnalyticsManagerLayout';
import { PlatformOverviewPage } from '@/pages/analytics/PlatformOverviewPage';
import { TenantAnalyticsPage } from '@/pages/analytics/TenantAnalyticsPage';
import { UsageAnalyticsPage } from '@/pages/analytics/UsageAnalyticsPage';
import { RevenueAnalyticsPage } from '@/pages/analytics/RevenueAnalyticsPage';
import { BuildAnalyticsPage } from '@/pages/analytics/BuildAnalyticsPage';
import { AdsAnalyticsSummaryPage } from '@/pages/analytics/AdsAnalyticsSummaryPage';
import { SystemHealthPage } from '@/pages/analytics/SystemHealthPage';
import { AlertsPage } from '@/pages/analytics/AlertsPage';
import { SupportListPage } from '@/pages/support/SupportListPage';
import { SupportDetailPage } from '@/pages/support/SupportDetailPage';
import { SystemSettingsLayout } from '@/components/settings/SystemSettingsLayout';
import { PlatformSettingsPage } from '@/pages/settings/PlatformSettingsPage';
import { AuthenticationSettingsPage } from '@/pages/settings/AuthenticationSettingsPage';
import { NotificationSettingsPage } from '@/pages/settings/NotificationSettingsPage';
import { PaymentSettingsPage } from '@/pages/settings/PaymentSettingsPage';
import { SystemBuildSettingsPage } from '@/pages/settings/SystemBuildSettingsPage';
import { StorageSettingsPage } from '@/pages/settings/StorageSettingsPage';
import { ApiSettingsPage } from '@/pages/settings/ApiSettingsPage';
import { SecuritySettingsPage } from '@/pages/settings/SecuritySettingsPage';
import { MaintenanceSettingsPage } from '@/pages/settings/MaintenanceSettingsPage';
import { LogsSettingsPage } from '@/pages/settings/LogsSettingsPage';
import { PlatformConfigStorePage } from '@/pages/settings/PlatformConfigStorePage';
import { AiBrandingSettingsPage } from '@/pages/settings/AiBrandingSettingsPage';
import { LogsManagerLayout } from '@/components/logs/LogsManagerLayout';
import { ActivityLogsPage } from '@/pages/logs-monitoring/ActivityLogsPage';
import { ApiLogsPage } from '@/pages/logs-monitoring/ApiLogsPage';
import { ErrorLogsPage } from '@/pages/logs-monitoring/ErrorLogsPage';
import { LoginLogsPage } from '@/pages/logs-monitoring/LoginLogsPage';
import { PlatformBuildLogsPage } from '@/pages/logs-monitoring/PlatformBuildLogsPage';
import { LogsSystemMonitoringPage } from '@/pages/logs-monitoring/LogsSystemMonitoringPage';
import { LogsAlertsPage } from '@/pages/logs-monitoring/LogsAlertsPage';
import { AdminRbacLayout } from '@/components/admin-rbac/AdminRbacLayout';
import { StaffUsersPage } from '@/pages/admin-rbac/StaffUsersPage';
import { RbacRolesPage } from '@/pages/admin-rbac/RbacRolesPage';
import { RbacPermissionsPage } from '@/pages/admin-rbac/RbacPermissionsPage';
import { RbacStaffActivityPage } from '@/pages/admin-rbac/RbacStaffActivityPage';
import { LanguageModuleLayout } from '@/components/language/LanguageModuleLayout';
import { LanguagesCatalogPage } from '@/pages/languages/LanguagesCatalogPage';
import { TranslationKeysPage } from '@/pages/languages/TranslationKeysPage';
import { TranslationsEditorPage } from '@/pages/languages/TranslationsEditorPage';
import { TranslationsImportExportPage } from '@/pages/languages/TranslationsImportExportPage';
import { LanguageSettingsPage } from '@/pages/languages/LanguageSettingsPage';
import { NotificationTemplatesLayout } from '@/components/notifications/NotificationTemplatesLayout';
import { NotificationTemplatesListPage } from '@/pages/notifications/NotificationTemplatesListPage';
import { NotificationChannelsPage } from '@/pages/notifications/NotificationChannelsPage';
import { NotificationVariablesPage } from '@/pages/notifications/NotificationVariablesPage';
import { NotificationPreviewPage } from '@/pages/notifications/NotificationPreviewPage';
import { NotificationLogsPage } from '@/pages/notifications/NotificationLogsPage';
import { IntegrationsLayout } from '@/components/integrations/IntegrationsLayout';
import { IntegrationsDashboardPage } from '@/pages/integrations/IntegrationsDashboardPage';
import { SmsProvidersPage } from '@/pages/integrations/SmsProvidersPage';
import { EmailProvidersPage } from '@/pages/integrations/EmailProvidersPage';
import { PushProvidersPage } from '@/pages/integrations/PushProvidersPage';
import { PaymentGatewaysPage } from '@/pages/integrations/PaymentGatewaysPage';
import { StorageProvidersPage } from '@/pages/integrations/StorageProvidersPage';
import { WebhooksPage } from '@/pages/integrations/WebhooksPage';
import { ApiKeysPage } from '@/pages/integrations/ApiKeysPage';
import { MediaManagerLayout } from '@/components/media/MediaManagerLayout';
import { MediaLibraryPage } from '@/pages/media/MediaLibraryPage';
import { MediaUploadPage } from '@/pages/media/MediaUploadPage';
import { MediaFoldersPage } from '@/pages/media/MediaFoldersPage';
import { MediaStoragePage } from '@/pages/media/MediaStoragePage';
import { FeatureFlagsLayout } from '@/components/feature-flags/FeatureFlagsLayout';
import { FeatureFlagsListPage } from '@/pages/feature-flags/FeatureFlagsListPage';
import { FeatureGroupsPage } from '@/pages/feature-flags/FeatureGroupsPage';
import { PlanBasedAccessPage } from '@/pages/feature-flags/PlanBasedAccessPage';
import { TenantOverridesPage } from '@/pages/feature-flags/TenantOverridesPage';
import { FeatureLogsPage } from '@/pages/feature-flags/FeatureLogsPage';
import { SchedulerLayout } from '@/components/scheduler/SchedulerLayout';
import { ScheduledJobsPage } from '@/pages/scheduler/ScheduledJobsPage';
import { JobQueuePage } from '@/pages/scheduler/JobQueuePage';
import { JobHistoryPage } from '@/pages/scheduler/JobHistoryPage';
import { ManualTriggerPage } from '@/pages/scheduler/ManualTriggerPage';
import { SchedulerSettingsPage } from '@/pages/scheduler/SchedulerSettingsPage';
import { AnnouncementsLayout } from '@/components/announcements/AnnouncementsLayout';
import { AnnouncementsListPage } from '@/pages/announcements/AnnouncementsListPage';
import { AnnouncementCreatePage } from '@/pages/announcements/AnnouncementCreatePage';
import { TargetAudiencePage } from '@/pages/announcements/TargetAudiencePage';
import { AnnouncementHistoryPage } from '@/pages/announcements/AnnouncementHistoryPage';
import { AnnouncementSettingsPage } from '@/pages/announcements/AnnouncementSettingsPage';
import { BackupLayout } from '@/components/backup/BackupLayout';
import { BackupDashboardPage } from '@/pages/backup/BackupDashboardPage';
import { ManualBackupPage } from '@/pages/backup/ManualBackupPage';
import { BackupHistoryPage } from '@/pages/backup/BackupHistoryPage';
import { RestoreSystemPage } from '@/pages/backup/RestoreSystemPage';
import { BackupSettingsPage } from '@/pages/backup/BackupSettingsPage';
import { CouponLayout } from '@/components/coupons/CouponLayout';
import { CouponListPage } from '@/pages/coupons/CouponListPage';
import { CouponFormPage } from '@/pages/coupons/CouponFormPage';
import { CouponCampaignsPage } from '@/pages/coupons/CouponCampaignsPage';
import { CouponAnalyticsPage } from '@/pages/coupons/CouponAnalyticsPage';
import { CouponSettingsPage } from '@/pages/coupons/CouponSettingsPage';
import { DistributorCouponAnalyticsPage } from '@/pages/coupons/DistributorCouponAnalyticsPage';
import { DistributorCouponUsagePage } from '@/pages/coupons/DistributorCouponUsagePage';
import { BillingLayout } from '@/components/billing/BillingLayout';
import { SubscriptionInvoicesPage } from '@/pages/billing/SubscriptionInvoicesPage';
import { BillingPaymentsPage } from '@/pages/billing/BillingPaymentsPage';
import { PlanBillingPage } from '@/pages/billing/PlanBillingPage';
import { BillingRevenueReportsPage } from '@/pages/billing/BillingRevenueReportsPage';
import { BillingRefundsPage } from '@/pages/billing/BillingRefundsPage';
import { IndustriesLayout } from '@/components/industries/IndustriesLayout';
import { IndustryListPage } from '@/pages/industries/IndustryListPage';
import { IndustryFormPage } from '@/pages/industries/IndustryFormPage';
import { IndustryMappingPage } from '@/pages/industries/IndustryMappingPage';
import { LocationLayout } from '@/components/locations/LocationLayout';
import { CountriesPage } from '@/pages/locations/CountriesPage';
import { CountryFormPage } from '@/pages/locations/CountryFormPage';
import { StatesPage } from '@/pages/locations/StatesPage';
import { CitiesPage } from '@/pages/locations/CitiesPage';
import { PincodesPage } from '@/pages/locations/PincodesPage';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { OtpPage } from '@/pages/auth/OtpPage';
import { whatsappAppRoutes } from '@/modules/whatsapp/whatsappAppRoutes';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />

      <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/activity" element={<SystemActivityLayout />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<ActivityFeedPage />} />
          <Route path="tenants" element={<TenantActivityPage />} />
          <Route path="admin" element={<AdminActivityPage />} />
          <Route path="system" element={<SystemEventsActivityPage />} />
        </Route>

        <Route path="/tenants" element={<TenantListPage />} />
        <Route path="/tenants/:tenantId" element={<TenantDetailLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<TenantOverviewTab />} />
          <Route path="subscription" element={<TenantSubscriptionTab />} />
          <Route path="usage" element={<TenantUsageTab />} />
          <Route path="domains" element={<TenantDomainsTab />} />
          <Route path="builds" element={<TenantBuildsTab />} />
          <Route path="database" element={<TenantDatabaseTab />} />
          <Route path="whatsapp" element={<TenantWhatsappTab />} />
          <Route path="features" element={<TenantFeatureFlagsTab />} />
          <Route path="support" element={<TenantSupportTab />} />
          <Route path="activity" element={<TenantActivityTab />} />
          <Route path="danger" element={<TenantDangerTab />} />
        </Route>

        <Route path="/subscriptions/plans" element={<PlanListPage />} />
        <Route path="/subscriptions/plans/matrix" element={<PlanMatrixPage />} />
        <Route path="/subscriptions/plans/new" element={<PlanFormPage mode="create" />} />
        <Route path="/subscriptions/plans/:id/edit" element={<PlanFormPage mode="edit" />} />

        <Route path="/subscriptions/coupons" element={<CouponLayout />}>
          <Route index element={<Navigate to="list" replace />} />
          <Route path="list" element={<CouponListPage />} />
          <Route path="new" element={<CouponFormPage mode="create" />} />
          <Route path=":couponId/edit" element={<CouponFormPage mode="edit" />} />
          <Route path="campaigns" element={<CouponCampaignsPage />} />
          <Route path="analytics" element={<CouponAnalyticsPage />} />
          <Route path="settings" element={<CouponSettingsPage />} />
          <Route path="distributor-analytics" element={<DistributorCouponAnalyticsPage />} />
          <Route path="distributor-usage" element={<DistributorCouponUsagePage />} />
        </Route>

        <Route path="/billing" element={<BillingLayout />}>
          <Route index element={<Navigate to="invoices" replace />} />
          <Route path="invoices" element={<SubscriptionInvoicesPage />} />
          <Route path="payments" element={<BillingPaymentsPage />} />
          <Route path="plan-billing" element={<PlanBillingPage />} />
          <Route path="revenue" element={<BillingRevenueReportsPage />} />
          <Route path="refunds" element={<BillingRefundsPage />} />
        </Route>

        <Route path="/industries" element={<IndustriesLayout />}>
          <Route index element={<Navigate to="list" replace />} />
          <Route path="list" element={<IndustryListPage />} />
          <Route path="new" element={<IndustryFormPage mode="create" />} />
          <Route path=":industryId/edit" element={<IndustryFormPage mode="edit" />} />
          <Route path="mapping" element={<IndustryMappingPage />} />
        </Route>

        <Route path="/locations" element={<LocationLayout />}>
          <Route index element={<Navigate to="countries" replace />} />
          <Route path="countries/new" element={<CountryFormPage mode="create" />} />
          <Route path="countries/:countryId/edit" element={<CountryFormPage mode="edit" />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="states" element={<StatesPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="pincodes" element={<PincodesPage />} />
        </Route>

        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/categories/new" element={<CategoryFormPage mode="create" />} />
        <Route path="/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductFormPage mode="create" />} />
        <Route path="/products/:id/edit" element={<ProductFormPage mode="edit" />} />

        <Route path="/attributes" element={<AttributeListPage />} />
        <Route path="/attributes/new" element={<AttributeFormPage mode="create" />} />
        <Route path="/attributes/:id/edit" element={<AttributeFormPage mode="edit" />} />

        <Route path="/master-brands" element={<MasterBrandListPage />} />
        <Route path="/master-brands/new" element={<MasterBrandFormPage mode="create" />} />
        <Route path="/master-brands/:id/edit" element={<MasterBrandFormPage mode="edit" />} />

        <Route path="/build" element={<BuildManagerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<BuildDashboardPage />} />
          <Route path="queue" element={<BuildQueuePage />} />
          <Route path="history" element={<BuildHistoryPage />} />
          <Route path="logs/:buildId" element={<BuildLogsPage />} />
          <Route path="logs" element={<BuildLogsIndexPage />} />
          <Route path="infrastructure" element={<BuildInfrastructurePage />} />
          <Route path="settings" element={<BuildSettingsPage />} />
        </Route>

        <Route path="/themes" element={<ThemeManagerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ThemeDashboardPage />} />
          <Route path="list" element={<ThemeListPage />} />
          <Route path="combo-packs" element={<ThemeComboPacksPage />} />
          <Route path="preview" element={<ThemeComboPreviewPage />} />
          <Route path="upload" element={<ThemeUploadPage />} />
          <Route path="translations" element={<ThemeTranslationReviewPage />} />
          <Route path=":id/translations" element={<ThemeTranslationReviewPage />} />
          <Route path=":id/edit" element={<ThemeEditPage />} />
          <Route path=":id/preview" element={<ThemePreviewPage />} />
        </Route>

        <Route path="/ads" element={<AdsManagerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdsDashboardPage />} />
          <Route path="campaigns" element={<AdsCampaignsPage />} />
          <Route path="campaigns/new" element={<AdsCampaignFormPage />} />
          <Route path="campaigns/:id/edit" element={<AdsCampaignFormPage />} />
          <Route path="creatives" element={<AdsCreativesPage />} />
          <Route path="placements" element={<AdsPlacementsPage />} />
          <Route path="analytics" element={<AdsAnalyticsPage />} />
          <Route path="settings" element={<AdsSettingsPage />} />
        </Route>

        <Route path="/analytics" element={<AnalyticsManagerLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PlatformOverviewPage />} />
          <Route path="tenants" element={<TenantAnalyticsPage />} />
          <Route path="usage" element={<UsageAnalyticsPage />} />
          <Route path="revenue" element={<RevenueAnalyticsPage />} />
          <Route path="builds" element={<BuildAnalyticsPage />} />
          <Route path="ads" element={<AdsAnalyticsSummaryPage />} />
          <Route path="health" element={<SystemHealthPage />} />
          <Route path="alerts" element={<AlertsPage />} />
        </Route>
        <Route path="/support" element={<SupportListPage />} />
        <Route path="/support/:ticketId" element={<SupportDetailPage />} />

        <Route path="/admin-team" element={<AdminRbacLayout />}>
          <Route index element={<Navigate to="staff" replace />} />
          <Route path="staff" element={<StaffUsersPage />} />
          <Route path="roles" element={<RbacRolesPage />} />
          <Route path="permissions" element={<RbacPermissionsPage />} />
          <Route path="activity" element={<RbacStaffActivityPage />} />
        </Route>

        <Route path="/languages" element={<LanguageModuleLayout />}>
          <Route index element={<Navigate to="list" replace />} />
          <Route path="list" element={<LanguagesCatalogPage />} />
          <Route path="keys" element={<TranslationKeysPage />} />
          <Route path="translations" element={<TranslationsEditorPage />} />
          <Route path="import-export" element={<TranslationsImportExportPage />} />
          <Route path="settings" element={<LanguageSettingsPage />} />
        </Route>

        <Route path="/notifications" element={<NotificationTemplatesLayout />}>
          <Route index element={<Navigate to="templates" replace />} />
          <Route path="templates" element={<NotificationTemplatesListPage />} />
          <Route path="channels" element={<NotificationChannelsPage />} />
          <Route path="variables" element={<NotificationVariablesPage />} />
          <Route path="preview" element={<NotificationPreviewPage />} />
          <Route path="logs" element={<NotificationLogsPage />} />
        </Route>

        {whatsappAppRoutes}

        <Route path="/integrations" element={<IntegrationsLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<IntegrationsDashboardPage />} />
          <Route path="sms" element={<SmsProvidersPage />} />
          <Route path="email" element={<EmailProvidersPage />} />
          <Route path="push" element={<PushProvidersPage />} />
          <Route path="payments" element={<PaymentGatewaysPage />} />
          <Route path="storage" element={<StorageProvidersPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
        </Route>

        <Route path="/media" element={<MediaManagerLayout />}>
          <Route index element={<Navigate to="library" replace />} />
          <Route path="library" element={<MediaLibraryPage />} />
          <Route path="upload" element={<MediaUploadPage />} />
          <Route path="folders" element={<MediaFoldersPage />} />
          <Route path="storage" element={<MediaStoragePage />} />
        </Route>

        <Route path="/feature-flags" element={<FeatureFlagsLayout />}>
          <Route index element={<Navigate to="flags" replace />} />
          <Route path="flags" element={<FeatureFlagsListPage />} />
          <Route path="groups" element={<FeatureGroupsPage />} />
          <Route path="plans" element={<PlanBasedAccessPage />} />
          <Route path="overrides" element={<TenantOverridesPage />} />
          <Route path="logs" element={<FeatureLogsPage />} />
        </Route>

        <Route path="/scheduler" element={<SchedulerLayout />}>
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="jobs" element={<ScheduledJobsPage />} />
          <Route path="queue" element={<JobQueuePage />} />
          <Route path="history" element={<JobHistoryPage />} />
          <Route path="manual" element={<ManualTriggerPage />} />
          <Route path="settings" element={<SchedulerSettingsPage />} />
        </Route>

        <Route path="/announcements" element={<AnnouncementsLayout />}>
          <Route index element={<Navigate to="list" replace />} />
          <Route path="list" element={<AnnouncementsListPage />} />
          <Route path="create" element={<AnnouncementCreatePage />} />
          <Route path="audience" element={<TargetAudiencePage />} />
          <Route path="history" element={<AnnouncementHistoryPage />} />
          <Route path="settings" element={<AnnouncementSettingsPage />} />
        </Route>

        <Route path="/backup" element={<BackupLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<BackupDashboardPage />} />
          <Route path="manual" element={<ManualBackupPage />} />
          <Route path="history" element={<BackupHistoryPage />} />
          <Route path="restore" element={<RestoreSystemPage />} />
          <Route path="settings" element={<BackupSettingsPage />} />
        </Route>

        <Route path="/settings" element={<SystemSettingsLayout />}>
          <Route index element={<Navigate to="platform" replace />} />
          <Route path="platform" element={<PlatformSettingsPage />} />
          <Route path="platform-config" element={<PlatformConfigStorePage />} />
          <Route path="ai-branding" element={<AiBrandingSettingsPage />} />
          <Route path="authentication" element={<AuthenticationSettingsPage />} />
          <Route path="notifications" element={<NotificationSettingsPage />} />
          <Route path="payment" element={<PaymentSettingsPage />} />
          <Route path="build" element={<SystemBuildSettingsPage />} />
          <Route path="storage" element={<StorageSettingsPage />} />
          <Route path="api" element={<ApiSettingsPage />} />
          <Route path="security" element={<SecuritySettingsPage />} />
          <Route path="maintenance" element={<MaintenanceSettingsPage />} />
          <Route path="logs" element={<LogsSettingsPage />} />
        </Route>
        <Route path="/logs" element={<LogsManagerLayout />}>
          <Route index element={<Navigate to="activity" replace />} />
          <Route path="activity" element={<ActivityLogsPage />} />
          <Route path="api" element={<ApiLogsPage />} />
          <Route path="errors" element={<ErrorLogsPage />} />
          <Route path="login" element={<LoginLogsPage />} />
          <Route path="builds" element={<PlatformBuildLogsPage />} />
          <Route path="monitoring" element={<LogsSystemMonitoringPage />} />
          <Route path="alerts" element={<LogsAlertsPage />} />
        </Route>
      </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
