import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/apiClient";

export type CouponDiscountType = "PERCENTAGE" | "FIXED";

export type CouponRow = {
  id: string;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponInput = {
  code?: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  active: boolean;
};

type Envelope<T> = { success: boolean; data: T };

export async function fetchCoupons(): Promise<CouponRow[]> {
  return (await apiGet<Envelope<CouponRow[]>>("/coupons")).data;
}

export async function createCoupon(input: CouponInput): Promise<CouponRow> {
  return (await apiPost<Envelope<CouponRow>>("/coupons", input)).data;
}

export async function updateCoupon(id: string, input: CouponInput): Promise<CouponRow> {
  const { code: _code, ...patch } = input;
  return (await apiPatch<Envelope<CouponRow>>(`/coupons/${encodeURIComponent(id)}`, patch)).data;
}

export async function deleteCoupon(id: string): Promise<{ id: string; archived: boolean }> {
  return (await apiDelete<Envelope<{ id: string; archived: boolean }>>(`/coupons/${encodeURIComponent(id)}`)).data;
}
