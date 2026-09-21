/** Demo — maps to feature_flags, plan_features, tenant_feature_overrides, audit logs. */

export type FeatureFlagType = 'global' | 'plan_based' | 'tenant_specific' | 'beta';

export type FeatureStatus = 'enabled' | 'disabled';

export type FeatureRow = {
  featureId: string;
  featureName: string;
  module: string;
  type: FeatureFlagType;
  status: FeatureStatus;
  createdAt: string;
};

export type PlanDef = { planId: string; label: string };

export const PLANS: PlanDef[] = [
  { planId: 'free', label: 'Free' },
  { planId: 'basic', label: 'Basic' },
  { planId: 'premium', label: 'Premium' },
];

export const INITIAL_FEATURES: FeatureRow[] = [
  {
    featureId: 'coupons',
    featureName: 'Coupons',
    module: 'Orders',
    type: 'plan_based',
    status: 'enabled',
    createdAt: '2025-08-01',
  },
  {
    featureId: 'credit_limit',
    featureName: 'Credit Limit',
    module: 'Orders',
    type: 'plan_based',
    status: 'enabled',
    createdAt: '2025-08-15',
  },
  {
    featureId: 'discounts',
    featureName: 'Discounts',
    module: 'Orders',
    type: 'plan_based',
    status: 'disabled',
    createdAt: '2025-09-01',
  },
  {
    featureId: 'ads',
    featureName: 'Ads',
    module: 'Marketing',
    type: 'global',
    status: 'enabled',
    createdAt: '2025-07-20',
  },
  {
    featureId: 'advanced_analytics',
    featureName: 'Advanced Analytics',
    module: 'Analytics',
    type: 'plan_based',
    status: 'enabled',
    createdAt: '2025-10-10',
  },
  {
    featureId: 'loyalty_points',
    featureName: 'Loyalty Points',
    module: 'Commerce',
    type: 'beta',
    status: 'enabled',
    createdAt: '2026-01-05',
  },
];

/** featureId -> planId -> enabled */
export function initialPlanMatrix(): Record<string, Record<string, boolean>> {
  return {
    coupons: { free: false, basic: true, premium: true },
    credit_limit: { free: false, basic: false, premium: true },
    discounts: { free: false, basic: true, premium: true },
    ads: { free: true, basic: false, premium: false },
    advanced_analytics: { free: false, basic: false, premium: true },
    loyalty_points: { free: false, basic: false, premium: true },
  };
}

export type FeatureGroupDef = {
  groupId: string;
  name: string;
  featureIds: string[];
};

export const FEATURE_GROUPS: FeatureGroupDef[] = [
  {
    groupId: 'commerce',
    name: 'Commerce Features',
    featureIds: ['coupons', 'credit_limit', 'discounts', 'loyalty_points'],
  },
  {
    groupId: 'analytics',
    name: 'Analytics Features',
    featureIds: ['advanced_analytics'],
  },
  {
    groupId: 'marketing',
    name: 'Marketing Features',
    featureIds: ['ads'],
  },
  {
    groupId: 'infrastructure',
    name: 'Infrastructure Features',
    featureIds: [],
  },
];

export type TenantFeatureOverride = {
  id: string;
  tenantId: string;
  tenantName: string;
  featureId: string;
  enabled: boolean;
  note: string;
};

export const INITIAL_OVERRIDES: TenantFeatureOverride[] = [
  {
    id: 'tfo-1',
    tenantId: 'tn-enterprise-1',
    tenantName: 'ABC Distributor',
    featureId: 'coupons',
    enabled: true,
    note: 'Enterprise contract',
  },
  {
    id: 'tfo-2',
    tenantId: 'tn-beta-shop',
    tenantName: 'Beta Shop Co',
    featureId: 'loyalty_points',
    enabled: true,
    note: 'Beta program',
  },
];

export type FeatureLogRow = {
  id: string;
  featureName: string;
  action: string;
  user: string;
  timestamp: string;
};

export const INITIAL_FEATURE_LOGS: FeatureLogRow[] = [
  {
    id: 'fl-1',
    featureName: 'Coupons',
    action: 'Enabled for plan Premium',
    user: 'Deepak (Super Admin)',
    timestamp: '2026-04-10T10:45:00+05:30',
  },
  {
    id: 'fl-2',
    featureName: 'Ads',
    action: 'Global flag toggled — Free plan access',
    user: 'System',
    timestamp: '2026-04-09T16:20:00+05:30',
  },
];

export const TYPE_LABELS: Record<FeatureFlagType, string> = {
  global: 'Global',
  plan_based: 'Plan based',
  tenant_specific: 'Tenant specific',
  beta: 'Beta',
};
