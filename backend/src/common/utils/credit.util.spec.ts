import { assertCreditAllowsPlaceOrder } from './credit.util';

describe('credit checkout guard', () => {
  it('allows an order within the available ledger-derived credit', () => {
    expect(() =>
      assertCreditAllowsPlaceOrder('1000', '5000', '4000'),
    ).not.toThrow();
  });

  it('reports the available credit when the order exceeds the limit', () => {
    expect(() => assertCreditAllowsPlaceOrder('1250', '5000', '4000')).toThrow(
      'Credit limit exceeded. Available credit is INR 3750.00; order total is INR 4000.00.',
    );
  });
});
