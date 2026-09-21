/**
 * Canonical feature keys for plans / tenant overrides.
 * Backend par connect karte waqt: GET /admin/platform-features ya plan save payload mein yahi ids use ho sakti hain.
 */
export type PlatformFeatureDef = {
  id: string;
  label: string;
  group: string;
  description?: string;
};

/** Order of groups in UI */
export const FEATURE_GROUP_ORDER: string[] = [
  'Commerce',
  'Pricing',
  'Storefront',
  'Growth',
  'Insights',
  'Integrations',
  'Mobile',
  'Operations',
  'Notifications',
  'Platform',
];

export const PLATFORM_FEATURES: PlatformFeatureDef[] = [
  // Commerce
  {
    group: 'Commerce',
    id: 'products_catalog',
    label: 'Products & catalog',
    description: 'SKU, variants, inventory basics.',
  },
  {
    group: 'Commerce',
    id: 'categories_attributes',
    label: 'Categories & attributes',
    description: 'Catalog structure and attributes.',
  },
  {
    group: 'Commerce',
    id: 'orders_management',
    label: 'Orders & fulfillment',
    description: 'Order lifecycle, statuses, shipments.',
  },
  {
    group: 'Commerce',
    id: 'customers_crm',
    label: 'Customers',
    description: 'Customer records and segments.',
  },
  {
    group: 'Commerce',
    id: 'warehouses_inventory',
    label: 'Warehouses & inventory',
    description: 'Multi-location, stock transfers.',
  },
  {
    group: 'Commerce',
    id: 'invoices_documents',
    label: 'Invoices & documents',
    description: 'PDF invoices, invoice settings.',
  },
  // Pricing
  {
    group: 'Pricing',
    id: 'customer_specific_pricing',
    label: 'Customer-specific pricing',
    description: 'Per-customer price overrides.',
  },
  {
    group: 'Pricing',
    id: 'bulk_pricing',
    label: 'Bulk / tier pricing',
    description: 'Volume-based pricing rules.',
  },
  {
    group: 'Pricing',
    id: 'coupons_offers',
    label: 'Coupons & offers',
    description: 'Discount codes and promotions.',
  },
  // Storefront
  {
    group: 'Storefront',
    id: 'custom_domain',
    label: 'Custom domain',
    description: 'Bring your own domain & SSL.',
  },
  {
    group: 'Storefront',
    id: 'module_themes',
    label: 'Theme manager',
    description: 'Upload and switch storefront themes.',
  },
  // Growth
  {
    group: 'Growth',
    id: 'module_ads',
    label: 'Ads manager',
    description: 'Platform ad placements for tenant storefront.',
  },
  {
    group: 'Growth',
    id: 'module_referrals',
    label: 'Referrals',
    description: 'Referral codes, commissions, payouts.',
  },
  // Insights
  {
    group: 'Insights',
    id: 'module_analytics',
    label: 'Analytics',
    description: 'Dashboards and KPIs.',
  },
  {
    group: 'Insights',
    id: 'advanced_reports',
    label: 'Advanced reports',
    description: 'Exports, scheduled reports, deeper cuts.',
  },
  // Integrations
  {
    group: 'Integrations',
    id: 'api_access',
    label: 'API access',
    description: 'REST keys and quotas.',
  },
  {
    group: 'Integrations',
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Outbound events to external systems.',
  },
  // Mobile
  {
    group: 'Mobile',
    id: 'module_app_builds',
    label: 'App builds (mobile)',
    description: 'Controlled mobile app build queue.',
  },
  // Operations
  {
    group: 'Operations',
    id: 'module_support',
    label: 'Support tickets',
    description: 'In-app / platform support workflows.',
  },
  {
    group: 'Operations',
    id: 'staff_roles',
    label: 'Staff users & roles',
    description: 'RBAC beyond owner.',
  },
  {
    group: 'Operations',
    id: 'audit_logs',
    label: 'Audit & exports',
    description: 'Activity history and compliance exports.',
  },
  // Notifications
  {
    group: 'Notifications',
    id: 'push_email_sms',
    label: 'Push, email & SMS',
    description: 'Campaigns and transactional caps by plan.',
  },
  // Platform
  {
    group: 'Platform',
    id: 'translations',
    label: 'Translations / i18n',
    description: 'Multi-language content layer.',
  },
  {
    group: 'Platform',
    id: 'billing_portal',
    label: 'Self-serve billing portal',
    description: 'Tenant-facing plan upgrade & invoices.',
  },
];

export function createDefaultFeatureState(): Record<string, boolean> {
  return Object.fromEntries(PLATFORM_FEATURES.map((f) => [f.id, false]));
}

/** All features on (e.g. Enterprise). */
export function createAllFeaturesEnabled(): Record<string, boolean> {
  return Object.fromEntries(PLATFORM_FEATURES.map((f) => [f.id, true]));
}
