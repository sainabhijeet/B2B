import { translate } from "@/lib/translation-engine";

const COLORS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  SUBMITTED: "border-sky-200 bg-sky-50 text-sky-800",
  CONFIRMED: "border-sky-200 bg-sky-50 text-sky-800",
  PROCESSING: "border-indigo-200 bg-indigo-50 text-indigo-800",
  PACKED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  SHIPPED: "border-violet-200 bg-violet-50 text-violet-800",
  OUT_FOR_DELIVERY: "border-violet-200 bg-violet-50 text-violet-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
};

export default function OrderStatusBadge({ status, languageCode }: { status: string; languageCode: string }) {
  const normalized = status.toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${COLORS[normalized] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {translate(normalized.replace(/_/g, " ").toLowerCase().replace(/^./, (first) => first.toUpperCase()), languageCode)}
    </span>
  );
}
