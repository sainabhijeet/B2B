export const ORDER_PAYMENT_MODES = [
  'CREDIT',
  'UPI_QR',
  'NEFT',
  'CASH',
  'RAZORPAY',
  'PREPAID',
] as const;

export type OrderPaymentModeInput = (typeof ORDER_PAYMENT_MODES)[number];
export type CanonicalOrderPaymentMode =
  | 'CREDIT'
  | 'UPI_QR'
  | 'NEFT'
  | 'CASH'
  | 'RAZORPAY';

export const ORDER_PAYMENT_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'VERIFIED',
  'REJECTED',
] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export function isDeferredPaymentCheckoutMode(
  mode: CanonicalOrderPaymentMode,
): boolean {
  return mode === 'RAZORPAY' || mode === 'UPI_QR' || mode === 'NEFT';
}

export function normalizePaymentMode(
  value: string | null | undefined,
): CanonicalOrderPaymentMode {
  const upper = (value ?? 'CREDIT').trim().toUpperCase();
  if (upper === 'PREPAID') return 'UPI_QR';
  if (
    upper === 'CREDIT' ||
    upper === 'UPI_QR' ||
    upper === 'NEFT' ||
    upper === 'CASH' ||
    upper === 'RAZORPAY'
  ) {
    return upper;
  }
  return 'CREDIT';
}

export function normalizePaymentStatus(
  value: string | null | undefined,
): OrderPaymentStatus {
  const upper = (value ?? 'PENDING').trim().toUpperCase();
  if (upper === 'UPLOADED') return 'SUBMITTED';
  if (upper === 'APPROVED') return 'VERIFIED';
  if (
    upper === 'PENDING' ||
    upper === 'SUBMITTED' ||
    upper === 'VERIFIED' ||
    upper === 'REJECTED'
  ) {
    return upper;
  }
  return 'PENDING';
}
