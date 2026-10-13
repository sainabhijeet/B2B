"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { translate } from "@/lib/translation-engine";
import {
  STOREFRONT_WISHLIST_CHANGED,
  type StorefrontWishlistChangedDetail,
} from "@/lib/wishlist-events";

type WishlistEnvelope = {
  data?: {
    productIds?: unknown;
    items?: unknown;
  };
};

function wishlistCount(payload: WishlistEnvelope): number {
  if (Array.isArray(payload.data?.productIds)) return payload.data.productIds.length;
  if (Array.isArray(payload.data?.items)) return payload.data.items.length;
  return 0;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-7 w-7" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

export default function WishlistHeaderLink({ languageCode }: { languageCode?: string }) {
  const t = (value: string) => translate(value, languageCode);
  const [count, setCount] = useState(0);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch("/api/storefront/wishlist", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        if (version === requestVersion.current) setCount(0);
        return;
      }
      if (!response.ok) return;
      const payload = await response.json() as WishlistEnvelope;
      if (version === requestVersion.current) setCount(wishlistCount(payload));
    } catch {
      // Keep the last known count when a background refresh fails.
    }
  }, []);

  useEffect(() => {
    void load();
    const sync = (event: Event) => {
      requestVersion.current += 1;
      const detail = (event as CustomEvent<StorefrontWishlistChangedDetail>).detail;
      if (Array.isArray(detail?.productIds)) {
        setCount(detail.productIds.length);
        return;
      }
      if (typeof detail?.count === "number") {
        setCount(Math.max(0, detail.count));
        return;
      }
      void load();
    };
    window.addEventListener(STOREFRONT_WISHLIST_CHANGED, sync);
    return () => window.removeEventListener(STOREFRONT_WISHLIST_CHANGED, sync);
  }, [load]);

  return (
    <Link
      href="/wishlist"
      className="group relative hidden items-center gap-2 text-slate-950 transition hover:text-[var(--header-primary)] lg:flex"
      aria-label={`${t("Wishlist")}${count > 0 ? ` (${count})` : ""}`}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <HeartIcon />
        {count > 0 ? (
          <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      <span className="hidden text-xs font-extrabold xl:inline">{t("Wishlist")}</span>
    </Link>
  );
}
