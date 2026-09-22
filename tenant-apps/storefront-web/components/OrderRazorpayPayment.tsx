"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import { payWithRazorpay } from "@/lib/razorpay-checkout";
import { translate } from "@/lib/translation-engine";

type Props = {
  orderId: string;
  orderNumber: string;
  mode: string;
  status: string;
  orderStatus: string;
  languageCode: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
};

export default function OrderRazorpayPayment({ orderId, orderNumber, mode, status, orderStatus, languageCode, customerName, customerPhone, customerEmail }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  if (mode !== "RAZORPAY") return null;
  if (status === "VERIFIED" || verified) {
    return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 shadow-sm">{t("Online payment verified.")}</p>;
  }
  if (orderStatus !== "PENDING") return null;

  async function retry() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await payWithRazorpay({ orderId, orderNumber, customerName, customerPhone, customerEmail });
      if (result.status === "verified") {
        setVerified(true);
        emitStorefrontCartChanged();
        router.refresh();
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Online Pay. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">{t("Online Pay")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("Payment is pending. You can safely resume checkout; the server will check whether this order was already paid.")}</p>
      {message ? <p className="mt-3 text-sm text-amber-900" role="status">{t(message)}</p> : null}
      <button type="button" onClick={() => void retry()} disabled={busy} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
        {busy ? t("Checking payment…") : t("Pay Online with Razorpay")}
      </button>
    </section>
  );
}
