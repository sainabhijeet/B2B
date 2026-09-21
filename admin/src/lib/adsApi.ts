import type { ApiEnvelope } from '@/lib/apiTypes';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';

export type AdCreativeFromApi = {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string;
  cta: string | null;
  createdAt: string;
};

export type AdCampaignFromApi = {
  id: string;
  name: string;
  placement: string;
  adType: string;
  startDate: string;
  endDate: string;
  status: string;
  industry: string | null;
  country: string | null;
  deviceType: string | null;
  planTarget: string;
  creatives?: AdCreativeFromApi[];
  impressionsTotal?: number;
  clicksTotal?: number;
  createdAt: string;
  updatedAt: string;
};

export type AdsAnalyticsPayload = {
  totals: { impressions: number; clicks: number; conversions: number };
  series: Array<{
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
};

export async function fetchAdCampaigns(): Promise<AdCampaignFromApi[]> {
  const res = await apiGet<ApiEnvelope<AdCampaignFromApi[]>>('/ads/campaigns');
  return res.data;
}

export async function fetchAdCampaign(id: string): Promise<AdCampaignFromApi> {
  const res = await apiGet<ApiEnvelope<AdCampaignFromApi>>(`/ads/campaigns/${id}`);
  return res.data;
}

export async function createAdCampaign(body: Record<string, unknown>): Promise<AdCampaignFromApi> {
  const res = await apiPost<ApiEnvelope<AdCampaignFromApi>>('/ads/campaigns', body);
  return res.data;
}

export async function updateAdCampaign(
  id: string,
  body: Record<string, unknown>,
): Promise<AdCampaignFromApi> {
  const res = await apiPatch<ApiEnvelope<AdCampaignFromApi>>(`/ads/campaigns/${id}`, body);
  return res.data;
}

export async function deleteAdCampaign(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<{ deleted: boolean }>>(`/ads/campaigns/${id}`);
}

export async function fetchAdsAnalytics(): Promise<AdsAnalyticsPayload> {
  const res = await apiGet<ApiEnvelope<AdsAnalyticsPayload>>('/ads/analytics');
  return res.data;
}
