import {
  fetchDistributorPaymentSettings,
  patchDistributorPaymentSettings,
  type DistributorPaymentSettings,
} from "@/lib/distributorPanelApi";
import {
  buildStaticUpiPaymentUri,
  isValidUpiId,
  normalizeUpiId,
  upiValidationMessage,
} from "@/lib/upiQr";
import { Copy, Download, Landmark, QrCode, Save } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

const emptyPaymentSettings: DistributorPaymentSettings = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
  upiId: "",
};

export function BankDetailsPage() {
  const [form, setForm] = useState<DistributorPaymentSettings>(emptyPaymentSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchDistributorPaymentSettings()
      .then((data) => {
        if (cancelled) return;
        setForm(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load bank details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedUpiId = normalizeUpiId(form.upiId);
  const upiError = upiValidationMessage(form.upiId);
  const upiUri = useMemo(() => {
    if (!form.accountHolderName.trim() || !isValidUpiId(form.upiId)) return "";
    return buildStaticUpiPaymentUri(form.upiId, form.accountHolderName);
  }, [form.accountHolderName, form.upiId]);
  const hasQr = Boolean(upiUri && !upiError);
  const canSave = Boolean(
    form.accountHolderName.trim() &&
      form.bankName.trim() &&
      form.accountNumber.trim() &&
      form.ifsc.trim() &&
      !upiError,
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!hasQr) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setQrError(null);
      return;
    }
    void QRCode.toCanvas(canvasRef.current, upiUri, {
      errorCorrectionLevel: "M",
      margin: 4,
      scale: 8,
      width: 260,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(() => setQrError(null))
      .catch((e) => setQrError(e instanceof Error ? e.message : "Could not generate QR."));
  }, [hasQr, upiUri]);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const next = await patchDistributorPaymentSettings(form);
      setForm(next);
      setMessage("Bank details saved. New QR is ready for website and app.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bank details.");
    } finally {
      setSaving(false);
    }
  }

  async function copyUpiId() {
    if (!normalizedUpiId) return;
    await navigator.clipboard.writeText(normalizedUpiId);
    setMessage("UPI ID copied.");
  }

  function downloadQrPng() {
    const canvas = canvasRef.current;
    if (!canvas || !hasQr) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${normalizedUpiId.replace(/[^a-z0-9._-]+/gi, "_") || "upi"}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <Landmark className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              <h1 className="text-lg font-semibold text-slate-900">Bank Details</h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Customers will see these bank details and the static UPI QR during checkout.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading bank details...</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-800">
                Account holder *
                <input
                  className={inputClass}
                  value={form.accountHolderName}
                  onChange={(e) => setForm((s) => ({ ...s, accountHolderName: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Bank name *
                <input
                  className={inputClass}
                  value={form.bankName}
                  onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Account number *
                <input
                  className={`${inputClass} font-mono`}
                  value={form.accountNumber}
                  inputMode="numeric"
                  onChange={(e) =>
                    setForm((s) => ({ ...s, accountNumber: e.target.value.replace(/[^\d]/g, "") }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                IFSC *
                <input
                  className={`${inputClass} font-mono uppercase`}
                  value={form.ifsc}
                  maxLength={11}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ifsc: e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11) }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Branch
                <input
                  className={inputClass}
                  value={form.branch}
                  onChange={(e) => setForm((s) => ({ ...s, branch: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                UPI ID *
                <input
                  className={inputClass}
                  value={form.upiId}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, upiId: normalizeUpiId(e.target.value) }))
                  }
                />
                {upiError ? <span className="mt-1 block text-xs text-red-700">{upiError}</span> : null}
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <canvas
                ref={canvasRef}
                className={hasQr ? "mx-auto h-[220px] w-[220px] bg-white" : "hidden"}
                aria-label="UPI QR code"
              />
              {!hasQr ? (
                <div className="flex h-[220px] w-full items-center justify-center text-slate-400">
                  <QrCode className="h-14 w-14" aria-hidden />
                </div>
              ) : null}
              <p className="mt-3 break-all font-mono text-xs text-slate-700">{normalizedUpiId || "UPI ID"}</p>
              {qrError ? <p className="mt-2 text-xs text-red-700">{qrError}</p> : null}
              {hasQr ? <p className="mt-2 break-all text-[10px] text-slate-500">{upiUri}</p> : null}
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={!normalizedUpiId}
                  onClick={() => void copyUpiId()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy UPI ID
                </button>
                <button
                  type="button"
                  disabled={!hasQr || !!qrError}
                  onClick={downloadQrPng}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download QR (PNG)
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              {error ? (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {message}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save bank details"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
