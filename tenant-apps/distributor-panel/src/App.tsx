import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { LoginPage } from "@/pages/auth/LoginPage";
import { AdminHandoffPage } from "@/pages/auth/AdminHandoffPage";
import { OnboardingGate } from "@/pages/onboarding/OnboardingGate";
import { OnboardingWizard } from "@/pages/onboarding/OnboardingWizard";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { BillingLayout } from "@/pages/billing/BillingLayout";
import { BillingSubscriptionPage } from "@/pages/billing/BillingSubscriptionPage";
import { BillingPlansPage } from "@/pages/billing/BillingPlansPage";
import { ReferralsLayout } from "@/pages/referrals/ReferralsLayout";
import { ReferralsCodePage } from "@/pages/referrals/ReferralsCodePage";
import { ReferralsStatsPage } from "@/pages/referrals/ReferralsStatsPage";
import { ReferralsConversionsPage } from "@/pages/referrals/ReferralsConversionsPage";
import { WebsiteBuilderLayout } from "@/pages/website-builder/WebsiteBuilderLayout";
import { WebsiteSectionsEditorPage } from "@/pages/website-builder/WebsiteSectionsEditorPage";
import { ThemeChangePage } from "@/pages/website-builder/ThemeChangePage";
import { ThemeSettingsPage } from "@/pages/website-builder/ThemeSettingsPage";
import { ProductsPage } from "@/pages/catalog/ProductsPage";
import { ProductCreateWizardPage } from "@/pages/catalog/ProductCreateWizardPage";
import { ProductFormPage } from "@/pages/catalog/ProductFormPage";
import { ProductPricingPage } from "@/pages/catalog/ProductPricingPage";
import { ProductViewPage } from "@/pages/catalog/ProductViewPage";
import { CategoriesPage } from "@/pages/catalog/CategoriesPage";
import { AttributesPage } from "@/pages/catalog/AttributesPage";
import { BrandsPage } from "@/pages/catalog/BrandsPage";
import { CouponsPage } from "@/pages/marketing/CouponsPage";
import { OrdersListPage } from "@/pages/orders/OrdersListPage";
import { OrderDetailPage } from "@/pages/orders/OrderDetailPage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { CustomerCreatePage } from "@/pages/customers/CustomerCreatePage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { StockOverviewPage } from "@/pages/inventory/StockOverviewPage";
import { WarehousesInfoPage } from "@/pages/inventory/WarehousesInfoPage";
import { InvoicesListPage } from "@/pages/invoices/InvoicesListPage";
import { BankDetailsPage } from "@/pages/bank-details/BankDetailsPage";
import { AnalyticsSummaryPage } from "@/pages/analytics/AnalyticsSummaryPage";
import { SettingsIndexPage } from "@/pages/settings/SettingsIndexPage";
import { ReleaseHistoryPage } from "@/pages/release-management/ReleaseHistoryPage";
import { ReleaseSettingsPage } from "@/pages/release-management/ReleaseSettingsPage";
import { SupportTicketsPage } from "@/pages/support/SupportTicketsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-handoff" element={<AdminHandoffPage />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />

      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route element={<OnboardingGate />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/catalog/products" element={<ProductsPage />} />
            <Route path="/catalog/products/new" element={<Navigate to="/catalog/products/create" replace />} />
            <Route path="/catalog/products/create/classic" element={<ProductFormPage />} />
            <Route path="/catalog/products/create" element={<ProductCreateWizardPage />} />
            <Route path="/catalog/products/:productId/pricing" element={<ProductPricingPage />} />
            <Route path="/catalog/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/catalog/products/:id" element={<ProductViewPage />} />
            <Route path="/catalog/categories" element={<CategoriesPage />} />
            <Route path="/catalog/attributes" element={<AttributesPage />} />
            <Route path="/catalog/brands" element={<BrandsPage />} />

            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customers/new" element={<CustomerCreatePage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/bank-details" element={<BankDetailsPage />} />
            <Route path="/inventory/warehouses" element={<WarehousesInfoPage />} />
            <Route path="/inventory/stock" element={<StockOverviewPage />} />
            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/marketing/coupons" element={<CouponsPage />} />
            <Route path="/content/banners" element={<WebsiteSectionsEditorPage pageKey="home" />} />
            <Route path="/analytics" element={<AnalyticsSummaryPage />} />
            <Route path="/release-management/history" element={<ReleaseHistoryPage />} />
            <Route path="/release-management/settings" element={<ReleaseSettingsPage />} />
            {/* Keep real Settings UI here — do not replace with ModulePlaceholderPage (mobile toggles live in SettingsIndexPage). */}
            <Route path="/settings" element={<SettingsIndexPage />} />
            <Route path="/support" element={<SupportTicketsPage />} />
            <Route path="/settings/mobile-app" element={<Navigate to="/settings#mobile-app" replace />} />

            <Route path="/billing" element={<BillingLayout />}>
              <Route index element={<Navigate to="subscription" replace />} />
              <Route path="subscription" element={<BillingSubscriptionPage />} />
              <Route path="plans" element={<BillingPlansPage />} />
            </Route>

            <Route path="/referrals" element={<ReferralsLayout />}>
              <Route index element={<Navigate to="code" replace />} />
              <Route path="code" element={<ReferralsCodePage />} />
              <Route path="stats" element={<ReferralsStatsPage />} />
              <Route path="conversions" element={<ReferralsConversionsPage />} />
            </Route>

            <Route path="/website-builder" element={<WebsiteBuilderLayout />}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<WebsiteSectionsEditorPage pageKey="home" />} />
              <Route path="category" element={<WebsiteSectionsEditorPage pageKey="category" />} />
              <Route path="product" element={<WebsiteSectionsEditorPage pageKey="product" />} />
              <Route path="theme" element={<ThemeChangePage />} />
              <Route path="theme-settings" element={<ThemeSettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
