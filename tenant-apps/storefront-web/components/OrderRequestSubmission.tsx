"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { translate } from "@/lib/translation-engine";

type Props = {
  orderId: string;
  orderStatus: string;
  hasPendingRequest: boolean;
  languageCode: string;
};

export default function OrderRequestSubmission(props: Props) {
  const t = (text: string) => translate(text, props.languageCode);
  const router = useRouter();
  const replacement = props.orderStatus === "DELIVERED";
  const [reason, setReason] = useState(replacement ? "DAMAGED_PRODUCT" : "ORDERED_BY_MISTAKE");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const type = replacement ? "REPLACEMENT" : "CANCEL";
  const eligible =
    props.orderStatus === "DELIVERED" ||
    ["PENDING", "CONFIRMED", "PROCESSING"].includes(props.orderStatus);

  if (!eligible || props.hasPendingRequest) return null;

  async function submit() {
    if (replacement && description.trim().length < 5) {
      setError(t("Description is required (minimum 5 characters)."));
      return;
    }
    if (replacement && (photos.length < 1 || photos.length > 5)) {
      setError(t("Upload between 1 and 5 photos."));
      return;
    }
    setBusy(true);
    setError("");
    const body = replacement ? new FormData() : JSON.stringify({ type, reason, note: description.trim() || undefined });
    if (body instanceof FormData) {
      body.set("type", type);
      body.set("reason", reason);
      body.set("description", description.trim());
      photos.forEach((photo) => body.append("photos", photo));
    }
    const response = await fetch(
      `/api/storefront/orders/${encodeURIComponent(props.orderId)}/requests`,
      {
        method: "POST",
        ...(replacement ? {} : { headers: { "Content-Type": "application/json" } }),
        body,
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[]; error?: string }
      | null;
    if (!response.ok) {
      const message = Array.isArray(payload?.message)
        ? payload.message.join(", ")
        : payload?.message || payload?.error;
      setError(message || t("Could not submit the request."));
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        {replacement ? t("Replacement request") : t("Cancel order")}
      </h2>
      <div className="mt-3 grid max-w-lg gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor="order-request-reason">{t("Reason")}</label>
        <select
          id="order-request-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {(replacement
            ? [["DAMAGED_PRODUCT", "Damaged Product"], ["DEFECTIVE_PRODUCT", "Defective Product"], ["WRONG_ITEM_RECEIVED", "Wrong Item Received"], ["MISSING_ITEM", "Missing Item"], ["OTHER", "Other"]]
            : [["ORDERED_BY_MISTAKE", "Ordered by mistake"], ["WRONG_QUANTITY", "Wrong quantity"], ["DUPLICATE_ORDER", "Duplicate order"], ["PRICE_ISSUE", "Price issue"], ["OTHER", "Other"]]
          ).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        </select>
        <label className="text-sm font-medium text-slate-800" htmlFor="order-request-description">
          {replacement ? t("Description") : t("Optional note")}
        </label>
        <textarea
          id="order-request-description"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, replacement ? 1000 : 500))}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          maxLength={replacement ? 1000 : 500}
          required={replacement}
        />
        {replacement ? (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 5))}
            className="text-sm"
          />
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          {busy ? t("Submitting") : t("Submit request")}
        </button>
      </div>
    </section>
  );
}
