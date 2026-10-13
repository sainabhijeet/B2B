import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";

type StorefrontAppConfigEnvelope = {
  data?: {
    enableCreditView?: boolean;
  } | null;
};

export type StorefrontFeatureConfig = {
  creditViewEnabled: boolean;
};

/**
 * Storefront feature flags are fail-closed so a temporary/invalid config
 * response cannot expose a tenant-disabled account feature.
 */
export async function getStorefrontFeatureConfig(): Promise<StorefrontFeatureConfig> {
  const response = await storefrontAuthedFetchReadOnly("/storefront/app-config");
  const payload = (await response.json().catch(() => null)) as StorefrontAppConfigEnvelope | null;
  return {
    creditViewEnabled: response.ok && payload?.data?.enableCreditView === true,
  };
}
