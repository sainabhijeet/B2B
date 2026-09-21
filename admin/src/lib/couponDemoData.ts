/** Demo — maps to admin_coupons, admin_coupon_usage, coupon campaigns. */

import { PLAN_LIST_ROWS } from '@/lib/planDemoData';

export type DiscountType = 'percentage' | 'flat';

export type CouponStatus = 'active' | 'disabled' | 'expired';

export type AdminCouponRow = {
  couponId: string;
  code: string;
  discountType: DiscountType;
  value: number;
  planIds: string[];
  usageLimit: number | null;
  expiryDate: string;
  status: CouponStatus;
  createdAt: string;
  usedCount: number;
  revenueAttributed: number;
};

export type CouponCampaignRow = {
  campaignId: string;
  name: string;
  couponCodes: string[];
  startDate: string;
  endDate: string;
};

export type AdminCouponUsageRow = {
  usageId: string;
  couponId: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  discountAmount: number;
  usedAt: string;
};

export type CouponGlobalSettings = {
  enabled: boolean;
  allowStacking: boolean;
  maxDiscountPercent: number;
  defaultExpiryDays: number;
};

export type DistributorCouponSummary = {
  distributorId: string;
  distributorName: string;
  activeCoupons: number;
  redemptions30d: number;
  discountGiven30d: number;
};

export type DistributorCouponUsageRow = {
  id: string;
  distributorName: string;
  couponCode: string;
  orderId: string;
  discountAmount: number;
  usedAt: string;
};

export const COUPON_PLAN_OPTIONS = PLAN_LIST_ROWS.map((p) => ({ id: p.id, name: p.name }));

export function planLabel(planIds: string[]): string {
  if (planIds.length === 0) return 'All plans';
  const names = planIds
    .map((id) => COUPON_PLAN_OPTIONS.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];
  return names.length ? names.join(', ') : 'All plans';
}

export function discountTypeLabel(type: DiscountType): string {
  return type === 'percentage' ? 'Percentage' : 'Flat';
}

export function formatDiscount(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}%`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export const INITIAL_ADMIN_COUPONS: AdminCouponRow[] = [
  {
    couponId: 'cpn-welcome20',
    code: 'WELCOME20',
    discountType: 'percentage',
    value: 20,
    planIds: ['pl-basic'],
    usageLimit: 500,
    expiryDate: '2026-12-31',
    status: 'active',
    createdAt: '2026-01-05T10:00:00+05:30',
    usedCount: 340,
    revenueAttributed: 1_200_000,
  },
  {
    couponId: 'cpn-upgrade10',
    code: 'UPGRADE10',
    discountType: 'percentage',
    value: 10,
    planIds: ['pl-premium'],
    usageLimit: 200,
    expiryDate: '2026-06-30',
    status: 'active',
    createdAt: '2026-02-01T09:00:00+05:30',
    usedCount: 89,
    revenueAttributed: 410_000,
  },
  {
    couponId: 'cpn-festive50',
    code: 'FESTIVE50',
    discountType: 'flat',
    value: 500,
    planIds: [],
    usageLimit: 1000,
    expiryDate: '2026-03-15',
    status: 'disabled',
    createdAt: '2025-12-20T12:00:00+05:30',
    usedCount: 612,
    revenueAttributed: 890_000,
  },
];

export const INITIAL_CAMPAIGNS: CouponCampaignRow[] = [
  {
    campaignId: 'cmp-ny',
    name: 'New Year Offer',
    couponCodes: ['WELCOME20', 'FESTIVE50'],
    startDate: '2026-01-01',
    endDate: '2026-01-15',
  },
  {
    campaignId: 'cmp-bf',
    name: 'Black Friday Offer',
    couponCodes: ['UPGRADE10'],
    startDate: '2025-11-28',
    endDate: '2025-12-02',
  },
  {
    campaignId: 'cmp-startup',
    name: 'Startup Launch Campaign',
    couponCodes: ['WELCOME20'],
    startDate: '2026-02-01',
    endDate: '2026-04-30',
  },
];

export const INITIAL_COUPON_USAGE: AdminCouponUsageRow[] = [
  {
    usageId: 'uc-1',
    couponId: 'cpn-welcome20',
    tenantId: 't-acme',
    tenantName: 'Acme Retail',
    planId: 'pl-basic',
    discountAmount: 199,
    usedAt: '2026-04-08T14:22:00+05:30',
  },
  {
    usageId: 'uc-2',
    couponId: 'cpn-welcome20',
    tenantId: 't-beta',
    tenantName: 'Beta Labs',
    planId: 'pl-basic',
    discountAmount: 199,
    usedAt: '2026-04-07T11:05:00+05:30',
  },
  {
    usageId: 'uc-3',
    couponId: 'cpn-upgrade10',
    tenantId: 't-gamma',
    tenantName: 'Gamma Foods',
    planId: 'pl-premium',
    discountAmount: 499,
    usedAt: '2026-04-06T09:40:00+05:30',
  },
];

export const DEFAULT_COUPON_SETTINGS: CouponGlobalSettings = {
  enabled: true,
  allowStacking: false,
  maxDiscountPercent: 50,
  defaultExpiryDays: 90,
};

export const DEMO_USAGE_TREND = [
  { week: 'W1 Mar', redemptions: 42 },
  { week: 'W2 Mar', redemptions: 58 },
  { week: 'W3 Mar', redemptions: 51 },
  { week: 'W4 Mar', redemptions: 67 },
  { week: 'W1 Apr', redemptions: 73 },
  { week: 'W2 Apr', redemptions: 69 },
];

export const DEMO_PLAN_CONVERSION = [
  { plan: 'Basic', checkouts: 420, withCoupon: 128, rate: 30.5 },
  { plan: 'Premium', checkouts: 180, withCoupon: 41, rate: 22.8 },
  { plan: 'Free', checkouts: 890, withCoupon: 12, rate: 1.3 },
];

export const INITIAL_DISTRIBUTOR_SUMMARIES: DistributorCouponSummary[] = [
  {
    distributorId: 'dist-1',
    distributorName: 'North Region Partners',
    activeCoupons: 14,
    redemptions30d: 890,
    discountGiven30d: 245_000,
  },
  {
    distributorId: 'dist-2',
    distributorName: 'Metro Wholesale Co.',
    activeCoupons: 8,
    redemptions30d: 412,
    discountGiven30d: 118_500,
  },
];

export const INITIAL_DISTRIBUTOR_USAGE: DistributorCouponUsageRow[] = [
  {
    id: 'du-1',
    distributorName: 'North Region Partners',
    couponCode: 'PARTNER-APR10',
    orderId: 'ord-8821',
    discountAmount: 450,
    usedAt: '2026-04-09T16:10:00+05:30',
  },
  {
    id: 'du-2',
    distributorName: 'Metro Wholesale Co.',
    couponCode: 'MWC-FIRST',
    orderId: 'ord-8819',
    discountAmount: 200,
    usedAt: '2026-04-09T12:00:00+05:30',
  },
];
