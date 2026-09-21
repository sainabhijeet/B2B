export type AdCampaignStatus = 'active' | 'paused' | 'scheduled' | 'ended';
export type AdType = 'banner_ad' | 'product_ad' | 'sponsored_listing';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'all';
export type PlanTarget = 'free_only' | 'all_plans';

export type AdCampaignRow = {
  id: string;
  name: string;
  placement: string;
  status: AdCampaignStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  adType: AdType;
  industry: string;
  country: string;
  deviceType: DeviceType;
  planTarget: PlanTarget;
};

export type AdCreativeRow = {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  cta: string;
};

export type PlacementRow = {
  id: string;
  name: string;
  position: string;
  enabled: boolean;
  maxAds: number;
};

export type DailyStatRow = {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
};

export const ADS_DASHBOARD = {
  activeCampaigns: 4,
  totalImpressions: 120_000,
  adClicks: 3_200,
  ctrPercent: 2.6,
  revenue: 2480,
};

export const AD_TYPE_OPTIONS: { value: AdType; label: string }[] = [
  { value: 'banner_ad', label: 'Banner Ad' },
  { value: 'product_ad', label: 'Product Ad' },
  { value: 'sponsored_listing', label: 'Sponsored Listing' },
];

export const AD_PLACEMENT_OPTIONS = [
  'App Home Banner',
  'Website Home Banner',
  'Product List Page',
  'Sidebar',
  'Cart Page',
];

export const AD_INDUSTRY_OPTIONS = ['Industrial', 'Footwear', 'Electronics', 'Retail'];
export const AD_COUNTRY_OPTIONS = ['India', 'UAE', 'USA', 'Global'];

export const AD_CAMPAIGN_ROWS: AdCampaignRow[] = [
  {
    id: 'cmp-summer-tools',
    name: 'Summer Tools Offer',
    placement: 'App Home Banner',
    status: 'active',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    impressions: 42000,
    clicks: 1080,
    adType: 'banner_ad',
    industry: 'Industrial',
    country: 'India',
    deviceType: 'all',
    planTarget: 'free_only',
  },
  {
    id: 'cmp-safety-kits',
    name: 'Industrial Safety Gear',
    placement: 'Product List Page',
    status: 'active',
    startDate: '2026-04-05',
    endDate: '2026-05-05',
    impressions: 50000,
    clicks: 1200,
    adType: 'sponsored_listing',
    industry: 'Industrial',
    country: 'Global',
    deviceType: 'desktop',
    planTarget: 'free_only',
  },
  {
    id: 'cmp-sneaker-weekend',
    name: 'Footwear Weekend Deals',
    placement: 'Website Home Banner',
    status: 'scheduled',
    startDate: '2026-04-20',
    endDate: '2026-05-02',
    impressions: 18000,
    clicks: 540,
    adType: 'banner_ad',
    industry: 'Footwear',
    country: 'India',
    deviceType: 'mobile',
    planTarget: 'free_only',
  },
  {
    id: 'cmp-cart-upsell',
    name: 'Cart Accessories Upsell',
    placement: 'Cart Page',
    status: 'paused',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    impressions: 10000,
    clicks: 180,
    adType: 'product_ad',
    industry: 'Retail',
    country: 'UAE',
    deviceType: 'all',
    planTarget: 'free_only',
  },
];

export const AD_CREATIVES: AdCreativeRow[] = [
  {
    id: 'crt-101',
    campaignId: 'cmp-summer-tools',
    title: 'Industrial Safety Gear',
    description: 'Certified helmets, gloves and boots for factory teams.',
    imageUrl: '/storage/demo/ads/safety-gear.png',
    targetUrl: 'https://example.com/safety',
    cta: 'Shop Now',
  },
  {
    id: 'crt-102',
    campaignId: 'cmp-sneaker-weekend',
    title: 'Weekend Sneaker Sale',
    description: 'Up to 35% off on running and training shoes.',
    imageUrl: '/storage/demo/ads/sneaker-sale.png',
    targetUrl: 'https://example.com/footwear',
    cta: 'Explore',
  },
];

export const AD_PLACEMENTS: PlacementRow[] = [
  { id: 'pl-1', name: 'App Home Banner', position: 'Top', enabled: true, maxAds: 1 },
  { id: 'pl-2', name: 'Website Home Banner', position: 'Top', enabled: true, maxAds: 1 },
  { id: 'pl-3', name: 'Product List Page', position: 'Inline #2', enabled: true, maxAds: 2 },
  { id: 'pl-4', name: 'Sidebar', position: 'Right rail', enabled: false, maxAds: 1 },
  { id: 'pl-5', name: 'Cart Page', position: 'Below totals', enabled: true, maxAds: 1 },
];

export const AD_DAILY_STATS: DailyStatRow[] = [
  { date: 'Apr 04', impressions: 9200, clicks: 238, conversions: 22 },
  { date: 'Apr 05', impressions: 10100, clicks: 269, conversions: 24 },
  { date: 'Apr 06', impressions: 9800, clicks: 244, conversions: 21 },
  { date: 'Apr 07', impressions: 11300, clicks: 295, conversions: 28 },
  { date: 'Apr 08', impressions: 12000, clicks: 320, conversions: 33 },
  { date: 'Apr 09', impressions: 12600, clicks: 348, conversions: 36 },
];

export type AdSettingsState = {
  maxAdsPerPage: number;
  adFrequencyMinutes: number;
  adRotation: 'round_robin' | 'weighted';
  displayRule: string;
};

export const DEFAULT_AD_SETTINGS: AdSettingsState = {
  maxAdsPerPage: 2,
  adFrequencyMinutes: 8,
  adRotation: 'round_robin',
  displayRule: 'Free plan users only',
};
