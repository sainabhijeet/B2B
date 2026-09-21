import type { AdCampaignFromApi } from '@/lib/adsApi';

export type UiCampaignStatus = 'active' | 'paused' | 'scheduled' | 'ended';
export type UiAdType = 'banner_ad' | 'product_ad' | 'sponsored_listing';
export type UiDeviceType = 'all' | 'mobile' | 'tablet' | 'desktop';
export type UiPlanTarget = 'free_only' | 'all_plans';

export type AdsCampaignFormValues = {
  name: string;
  adType: UiAdType;
  placement: string;
  startDate: string;
  endDate: string;
  status: UiCampaignStatus;
  industry: string;
  country: string;
  deviceType: UiDeviceType;
  planTarget: UiPlanTarget;
};

export function apiStatusToUi(s: string): UiCampaignStatus {
  const x = s.toUpperCase();
  if (x === 'ACTIVE') return 'active';
  if (x === 'PAUSED') return 'paused';
  if (x === 'SCHEDULED') return 'scheduled';
  return 'ended';
}

export function uiStatusToApi(s: UiCampaignStatus): string {
  return s.toUpperCase();
}

export function apiAdTypeToUi(t: string): UiAdType {
  const x = t.toUpperCase();
  if (x === 'PRODUCT_AD') return 'product_ad';
  if (x === 'SPONSORED_LISTING') return 'sponsored_listing';
  return 'banner_ad';
}

export function uiAdTypeToApi(t: UiAdType): string {
  const m: Record<UiAdType, string> = {
    banner_ad: 'BANNER_AD',
    product_ad: 'PRODUCT_AD',
    sponsored_listing: 'SPONSORED_LISTING',
  };
  return m[t];
}

export function apiDeviceToUi(d: string | null | undefined): UiDeviceType {
  if (!d) return 'all';
  const x = d.toUpperCase();
  if (x === 'MOBILE') return 'mobile';
  if (x === 'TABLET') return 'tablet';
  if (x === 'DESKTOP') return 'desktop';
  return 'all';
}

export function uiDeviceToApi(d: UiDeviceType): string {
  if (d === 'all') return 'ALL';
  return d.toUpperCase();
}

export function apiPlanToUi(p: string | null | undefined): UiPlanTarget {
  if (p?.toUpperCase() === 'ALL_PLANS') return 'all_plans';
  return 'free_only';
}

export function uiPlanToApi(p: UiPlanTarget): string {
  return p === 'all_plans' ? 'ALL_PLANS' : 'FREE_ONLY';
}

export function campaignToFormValues(c: AdCampaignFromApi): AdsCampaignFormValues {
  return {
    name: c.name,
    adType: apiAdTypeToUi(c.adType),
    placement: c.placement,
    startDate: c.startDate.slice(0, 10),
    endDate: c.endDate.slice(0, 10),
    status: apiStatusToUi(c.status),
    industry: c.industry ?? '',
    country: c.country ?? '',
    deviceType: apiDeviceToUi(c.deviceType),
    planTarget: apiPlanToUi(c.planTarget),
  };
}

export function formValuesToCreatePayload(f: AdsCampaignFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: f.name,
    placement: f.placement,
    adType: uiAdTypeToApi(f.adType),
    startDate: f.startDate,
    endDate: f.endDate,
    status: uiStatusToApi(f.status),
    deviceType: uiDeviceToApi(f.deviceType),
    planTarget: uiPlanToApi(f.planTarget),
  };
  if (f.industry.trim()) payload.industry = f.industry.trim();
  if (f.country.trim()) payload.country = f.country.trim();
  return payload;
}
