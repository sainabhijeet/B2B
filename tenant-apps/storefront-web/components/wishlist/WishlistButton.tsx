"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { translate } from "@/lib/translation-engine";
import { emitStorefrontWishlistChanged, STOREFRONT_WISHLIST_CHANGED } from "@/lib/wishlist-events";

let cachedIds: string[] | null = null;
let pendingLoad: Promise<string[] | null> | null = null;
let mutationVersion = 0;

function loadWishlist(): Promise<string[] | null> {
  if (cachedIds) return Promise.resolve(cachedIds);
  if (!pendingLoad) {
    const requestVersion = mutationVersion;
    pendingLoad = fetch("/api/storefront/wishlist", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { data?: { productIds?: string[] } };
        const ids = Array.isArray(payload.data?.productIds) ? payload.data.productIds : [];
        if (requestVersion === mutationVersion) cachedIds = ids;
        return cachedIds ?? ids;
      })
      .catch(() => null)
      .finally(() => { pendingLoad = null; });
  }
  return pendingLoad;
}

export default function WishlistButton({ productId, languageCode, compact = false, initialSaved = false, onChange }: {
  productId: string;
  languageCode?: string;
  compact?: boolean;
  initialSaved?: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const t = (value: string) => translate(value, languageCode);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!initialSaved) {
      void loadWishlist().then((ids) => {
        if (active && ids) setSaved(ids.includes(productId));
      });
    }
    const sync = () => setSaved(Boolean(cachedIds?.includes(productId)));
    window.addEventListener(STOREFRONT_WISHLIST_CHANGED, sync);
    return () => { active = false; window.removeEventListener(STOREFRONT_WISHLIST_CHANGED, sync); };
  }, [initialSaved, productId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        saved ? `/api/storefront/wishlist/items/${encodeURIComponent(productId)}` : "/api/storefront/wishlist/items",
        {
          method: saved ? "DELETE" : "POST",
          credentials: "same-origin",
          headers: saved ? undefined : { "Content-Type": "application/json" },
          body: saved ? undefined : JSON.stringify({ productId }),
        },
      );
      if (response.status === 401) {
        const next = window.location.pathname + window.location.search;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!response.ok) {
        setError(t("Could not update wishlist. Please try again."));
        return;
      }
      const payload = await response.json() as { data?: { productIds?: string[] } };
      if (!Array.isArray(payload.data?.productIds)) {
        setError(t("Could not update wishlist. Please try again."));
        return;
      }
      mutationVersion += 1;
      cachedIds = payload.data.productIds;
      const nowSaved = cachedIds.includes(productId);
      setSaved(nowSaved);
      emitStorefrontWishlistChanged(cachedIds);
      onChange?.(nowSaved);
    } catch {
      setError(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const label = saved ? t("Remove from wishlist") : t("Add to wishlist");
  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        aria-label={label}
        aria-pressed={saved}
        title={label}
        disabled={busy}
        onClick={() => void toggle()}
        className={compact
          ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
          : "inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"}
      >
        <Heart className={`h-5 w-5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} aria-hidden="true" />
        {!compact ? <span>{label}</span> : null}
      </button>
      {error ? <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-lg">{error}</span> : null}
    </span>
  );
}
