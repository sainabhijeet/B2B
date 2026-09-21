import {
  isDeferredPaymentCheckoutMode,
  normalizePaymentMode,
  normalizePaymentStatus,
} from './order-payment-flow';

describe('order payment flow', () => {
  it('keeps Razorpay as a canonical payment mode', () => {
    expect(normalizePaymentMode('razorpay')).toBe('RAZORPAY');
  });

  it('keeps backward-compatible prepaid orders on UPI QR', () => {
    expect(normalizePaymentMode('PREPAID')).toBe('UPI_QR');
  });

  it('normalizes legacy approved payment status', () => {
    expect(normalizePaymentStatus('APPROVED')).toBe('VERIFIED');
  });

  it('keeps the cart until deferred payment checkout is committed', () => {
    expect(isDeferredPaymentCheckoutMode('RAZORPAY')).toBe(true);
    expect(isDeferredPaymentCheckoutMode('UPI_QR')).toBe(true);
    expect(isDeferredPaymentCheckoutMode('NEFT')).toBe(true);
    expect(isDeferredPaymentCheckoutMode('CASH')).toBe(false);
    expect(isDeferredPaymentCheckoutMode('CREDIT')).toBe(false);
  });
});
