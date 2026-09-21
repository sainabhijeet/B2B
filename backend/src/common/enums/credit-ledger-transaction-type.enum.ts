/** Append-only credit ledger line types (signed `amount`: + increases outstanding, − reduces). */
export enum CreditLedgerTransactionType {
  ORDER_DEBIT = 'ORDER_DEBIT',
  PAYMENT_CREDIT = 'PAYMENT_CREDIT',
  ADJUSTMENT_DEBIT = 'ADJUSTMENT_DEBIT',
  ADJUSTMENT_CREDIT = 'ADJUSTMENT_CREDIT',
  REVERSAL = 'REVERSAL',
  RETURN_CREDIT = 'RETURN_CREDIT',
  /** Initial outstanding when a customer is onboarded with opening balance (idempotent per customer). */
  OPENING_BALANCE = 'OPENING_BALANCE',
  /** Bad debt / bankruptcy — reduces outstanding (negative signed `amount`). */
  WRITE_OFF = 'WRITE_OFF',
}
