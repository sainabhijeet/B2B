/**
 * India financial year label (April–March), e.g. `2025-26` for 1 Apr 2025 – 31 Mar 2026.
 */
export function indiaFinancialYearLabel(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endShort = (startYear + 1) % 100;
  return `${startYear}-${String(endShort).padStart(2, '0')}`;
}

/** Inclusive `invoice_date` bounds for a FY label like `2025-26`. */
export function indiaFinancialYearDateRange(fyLabel: string): { start: string; end: string } {
  const startYear = parseInt(fyLabel.split('-')[0], 10);
  if (!Number.isFinite(startYear)) {
    throw new Error(`Invalid FY label: ${fyLabel}`);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${startYear}-04-01`;
  const end = `${startYear + 1}-03-31`;
  return { start, end };
}
