const UPI_ID_RE = /^[A-Za-z0-9._-]{2,128}@[A-Za-z][A-Za-z0-9._-]{2,64}$/;

export function normalizeUpiId(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function isValidUpiId(value: string): boolean {
  return UPI_ID_RE.test(normalizeUpiId(value));
}

export function upiValidationMessage(value: string): string | null {
  const normalized = normalizeUpiId(value);
  if (!normalized) return "UPI ID is required.";
  if (/[+\s]/.test(value)) return "Enter only the UPI ID, for example name@bank. Do not add +91 or spaces.";
  if (!normalized.includes("@")) return "UPI ID must include @, for example name@bank.";
  if (!isValidUpiId(normalized)) return "UPI ID format is invalid.";
  return null;
}

export function buildStaticUpiPaymentUri(upiId: string, accountHolderName: string): string {
  return `upi://pay?pa=${normalizeUpiId(upiId)}&pn=${encodeURIComponent(accountHolderName.trim())}`;
}

export function buildDynamicUpiPaymentUri(input: {
  upiId: string;
  accountHolderName: string;
  amount: number | string;
  orderNumber: string;
  retailerName?: string | null;
  transactionNote?: string | null;
}): string {
  const amount = Number(input.amount);
  const note =
    input.transactionNote?.trim() ||
    `Order ${input.orderNumber.trim()} payment${
      input.retailerName?.trim() ? ` from ${input.retailerName.trim()}` : ""
    }`;
  const params = new URLSearchParams({
    pa: normalizeUpiId(input.upiId),
    pn: input.accountHolderName.trim(),
    am: Number.isFinite(amount) ? amount.toFixed(2) : String(input.amount),
    cu: "INR",
    tn: note,
    tr: input.orderNumber.trim(),
  });
  return `upi://pay?${params.toString()}`;
}
