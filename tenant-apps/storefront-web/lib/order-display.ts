import { formatCurrency, localeForLanguage } from "@/lib/language-consistency";

export function orderMoney(value: string | number | null | undefined, languageCode: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? formatCurrency(amount, languageCode) : "—";
}

export function orderDateTime(value: string, languageCode: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeForLanguage(languageCode), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function orderPaymentLabel(mode: string | null | undefined): string {
  switch (mode?.toUpperCase()) {
    case "RAZORPAY": return "Online Pay · Razorpay";
    case "UPI_QR": return "UPI QR";
    case "NEFT": return "Bank transfer";
    case "CREDIT": return "On account · Credit";
    case "CASH": return "Cash";
    default: return mode?.replace(/_/g, " ") || "Not specified";
  }
}
