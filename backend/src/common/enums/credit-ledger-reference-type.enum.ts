/**
 * Stable `credit_transactions.reference_type` values for analytics / exports.
 * Keep DB values aligned with this enum (varchar column).
 */
export enum CreditLedgerReferenceType {
  ORDER = 'ORDER',
  RETURN = 'RETURN',
  PAYMENT = 'PAYMENT',
  MANUAL_PAYMENT = 'MANUAL_PAYMENT',
  OPENING_BALANCE = 'OPENING_BALANCE',
  /** Manual distributor delta via `POST …/credit-adjust`. */
  ADJUSTMENT = 'ADJUSTMENT',
  /** Bad debt / bankruptcy write-down (`WRITE_OFF` line type). */
  WRITE_OFF = 'WRITE_OFF',
}
