import { BadRequestException } from '@nestjs/common';

/**
 * `credit_balance` = outstanding owed by the customer (same units as `credit_limit`).
 * Order is allowed when: credit_balance + order_total <= credit_limit.
 */
export function assertCreditAllowsPlaceOrder(
  creditBalance: string,
  creditLimit: string,
  orderTotal: string,
): void {
  const bal = Number(creditBalance);
  const lim = Number(creditLimit);
  const ord = Number(orderTotal);
  if (![bal, lim, ord].every((n) => Number.isFinite(n))) {
    throw new BadRequestException('Invalid credit or order amount.');
  }
  if (bal < 0 || lim < 0 || ord < 0) {
    throw new BadRequestException(
      'Credit and order amounts must be non-negative.',
    );
  }
  if (bal + ord > lim + 1e-6) {
    const available = Math.max(0, lim - bal);
    throw new BadRequestException(
      `Credit limit exceeded. Available credit is INR ${available.toFixed(2)}; order total is INR ${ord.toFixed(2)}.`,
    );
  }
}
