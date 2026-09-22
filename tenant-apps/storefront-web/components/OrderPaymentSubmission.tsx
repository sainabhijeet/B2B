"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { translate } from "@/lib/translation-engine";

type Props = {
  orderId: string;
  orderNumber: string;
  mode: string;
  amount: string;
  status: string;
  upiUri?: string | null;
  transactionNote?: string | null;
  languageCode: string;
};

export default function OrderPaymentSubmission(props: Props) {
  const t = (text: string) => translate(text, props.languageCode);
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canvas.current || !props.upiUri) return;
    void QRCode.toCanvas(canvas.current, props.upiUri, {
      width: 200,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [props.upiUri]);

  if (!["UPI_QR", "NEFT"].includes(props.mode) || !["PENDING", "REJECTED"].includes(props.status)) {
    return null;
  }

  async function submit() {
    const normalizedUtr = utr.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,35}$/.test(normalizedUtr) || !proof) {
      setError(t("Enter a valid UTR and attach payment proof."));
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("paymentMode", props.mode);
    form.set("utrNumber", normalizedUtr);
    form.set("amount", Number(props.amount).toFixed(2));
    form.set("idempotencyKey", crypto.randomUUID());
    form.set("paymentNote", props.transactionNote || `Order ${props.orderNumber}`);
    form.set("proof", proof);
    const response = await fetch(`/api/storefront/orders/${encodeURIComponent(props.orderId)}/payment-proof`, {
      method: "POST",
      body: form,
    });
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    if (!response.ok) {
      const message = Array.isArray(payload?.message) ? payload?.message.join(", ") : payload?.message;
      setError(message || t("Payment submission failed."));
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">{t("Submit payment")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("Upload the transaction reference and payment proof for verification.")}</p>
      {props.upiUri ? (
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <canvas ref={canvas} className="h-[200px] w-[200px] bg-white" aria-label={t("UPI QR code")} />
          <div className="text-sm text-slate-700">
            <p className="font-semibold">INR {Number(props.amount).toFixed(2)}</p>
            {props.transactionNote ? <p className="mt-1">{props.transactionNote}</p> : null}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid max-w-lg gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor="payment-utr">{t("UTR number")}</label>
        <input
          id="payment-utr"
          value={utr}
          onChange={(event) => setUtr(event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 35))}
          className="rounded-md border border-slate-300 px-3 py-2"
          autoComplete="off"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setProof(event.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-fit rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("Submitting") : t("Submit for verification")}
        </button>
      </div>
    </section>
  );
}
