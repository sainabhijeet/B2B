export const REPLACEMENT_REASONS = [
  'DAMAGED_PRODUCT',
  'DEFECTIVE_PRODUCT',
  'WRONG_ITEM_RECEIVED',
  'MISSING_ITEM',
  'OTHER',
] as const;

export const CANCELLATION_REASONS = [
  'ORDERED_BY_MISTAKE',
  'WRONG_QUANTITY',
  'DUPLICATE_ORDER',
  'PRICE_ISSUE',
  'OTHER',
] as const;

export const ACTIVE_ORDER_REQUEST_STATUSES = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REPLACEMENT_SHIPPED',
] as const;

export function isReplacementEligibleStatus(status: string): boolean {
  return status.trim().toUpperCase() === 'DELIVERED';
}

export function isCancellationEligibleStatus(status: string): boolean {
  return ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(status.trim().toUpperCase());
}

export function isReplacementReason(reason: string): boolean {
  return (REPLACEMENT_REASONS as readonly string[]).includes(reason);
}

export function isCancellationReason(reason: string): boolean {
  return (CANCELLATION_REASONS as readonly string[]).includes(reason);
}

export const REPLACEMENT_REVIEW_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  REQUESTED: ['START_REVIEW'],
  UNDER_REVIEW: ['APPROVE', 'REJECT'],
  APPROVED: ['MARK_SHIPPED'],
  REPLACEMENT_SHIPPED: ['COMPLETE'],
};
