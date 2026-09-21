/**
 * Effective GST % for a line: `variant.gst_rate` when set, else `product.tax_rate`.
 */
export function effectiveGstPercent(params: {
  variantGstRate: string | null | undefined;
  productTaxRate: string;
}): string {
  const v = params.variantGstRate;
  if (v != null && String(v).trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n.toFixed(2);
  }
  const p = Number(params.productTaxRate);
  if (Number.isFinite(p) && p >= 0) return p.toFixed(2);
  return '0.00';
}
