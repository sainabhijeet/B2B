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
export function planLabel(planIds: string[]): string {
  return planIds.length ? planIds.join(', ') : 'All plans';
}
export function discountTypeLabel(type: DiscountType): string {
  return type === 'percentage' ? 'Percentage' : 'Flat';
}
export function formatDiscount(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}%`;
  return `Rs ${value.toLocaleString('en-IN')}`;
}
