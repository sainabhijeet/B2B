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
export type TenantFeatureOverride = {
  id: string;
  tenantId: string;
  tenantName: string;
  featureId: string;
  enabled: boolean;
  note: string;
};
export type FeatureLogRow = {
  id: string;
  featureName: string;
  action: string;
  user: string;
  timestamp: string;
};
export const TYPE_LABELS: Record<FeatureFlagType, string> = {
  global: 'Global',
  plan_based: 'Plan based',
  tenant_specific: 'Tenant specific',
  beta: 'Beta',
};
