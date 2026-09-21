import {
  isCancellationEligibleStatus,
  isCancellationReason,
  isReplacementEligibleStatus,
  isReplacementReason,
  REPLACEMENT_REVIEW_TRANSITIONS,
} from './order-request-flow';

describe('order request flow', () => {
  it('allows replacement only after delivery', () => {
    expect(isReplacementEligibleStatus('DELIVERED')).toBe(true);
    for (const status of ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY']) {
      expect(isReplacementEligibleStatus(status)).toBe(false);
    }
  });

  it('allows cancellation only before shipment', () => {
    for (const status of ['PENDING', 'CONFIRMED', 'PROCESSING']) {
      expect(isCancellationEligibleStatus(status)).toBe(true);
    }
    for (const status of ['DISPATCHED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']) {
      expect(isCancellationEligibleStatus(status)).toBe(false);
    }
  });

  it('keeps replacement and cancellation reason sets separate', () => {
    expect(isReplacementReason('DAMAGED_PRODUCT')).toBe(true);
    expect(isReplacementReason('ORDERED_BY_MISTAKE')).toBe(false);
    expect(isCancellationReason('ORDERED_BY_MISTAKE')).toBe(true);
    expect(isCancellationReason('DAMAGED_PRODUCT')).toBe(false);
  });

  it('enforces the replacement lifecycle', () => {
    expect(REPLACEMENT_REVIEW_TRANSITIONS.REQUESTED).toEqual(['START_REVIEW']);
    expect(REPLACEMENT_REVIEW_TRANSITIONS.UNDER_REVIEW).toEqual(['APPROVE', 'REJECT']);
    expect(REPLACEMENT_REVIEW_TRANSITIONS.APPROVED).toEqual(['MARK_SHIPPED']);
    expect(REPLACEMENT_REVIEW_TRANSITIONS.REPLACEMENT_SHIPPED).toEqual(['COMPLETE']);
  });
});
