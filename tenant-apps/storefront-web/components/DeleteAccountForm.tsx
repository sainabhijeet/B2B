"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteAccountFormProps = {
  labels: {
    requestOtp: string;
    otpSent: string;
    otpLabel: string;
    deleteAccount: string;
    confirmation: string;
    signInRequired: string;
    failed: string;
  };
};

export default function DeleteAccountForm({ labels }: DeleteAccountFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestOtp() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/storefront/account-deletion/otp", { method: "POST" });
      if (response.status === 401) {
        setMessage(labels.signInRequired);
        return;
      }
      if (!response.ok) throw new Error(labels.failed);
      setSent(true);
      setMessage(labels.otpSent);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    if (!/^\d{6}$/.test(code) || !window.confirm(labels.confirmation)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/storefront/account-deletion", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message || labels.failed);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {!sent ? (
        <button
          type="button"
          disabled={busy}
          onClick={requestOtp}
          className="inline-flex rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {labels.requestOtp}
        </button>
      ) : (
        <div className="max-w-sm space-y-3">
          <label className="block text-sm font-medium text-slate-800" htmlFor="deletion-code">
            {labels.otpLabel}
          </label>
          <input
            id="deletion-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base"
          />
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={removeAccount}
            className="inline-flex rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {labels.deleteAccount}
          </button>
        </div>
      )}
      {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
