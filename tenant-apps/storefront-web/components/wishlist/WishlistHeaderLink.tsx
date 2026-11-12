"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { translate } from "@/lib/translation-engine";
import {
  STOREFRONT_WISHLIST_CHANGED,
  type StorefrontWishlistChangedDetail,
} from "@/lib/wishlist-events";
import { isPreviewCommerceLocation, PREVIEW_COMMERCE_CHANGED, readPreviewWishlist } from "@/lib/preview-commerce";
import { useCustomerSignedIn } from "@/components/auth/CustomerAuthContext";
import { customerLoginHref, customerLoginHrefWithCurrentContext, storefrontHrefWithCurrentContext } from "@/lib/customer-login-redirect";

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

export default function WishlistHeaderLink({ languageCode, displayMode = "default", directNavigation = false, active = false }: { languageCode?: string; displayMode?: "default" | "atelier" | "nav" | "mobile-nav"; directNavigation?: boolean; active?: boolean }) {
  const t = (value: string) => translate(value, languageCode);
  const signedIn = useCustomerSignedIn();
  const [count, setCount] = useState(0);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!signedIn) {
      setCount(0);
      return;
    }
    if (isPreviewCommerceLocation()) {
      setCount(readPreviewWishlist().length);
      return;
    }
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
  }, [signedIn]);

  useEffect(() => {
    void load();
    const sync = (event: Event) => {
      requestVersion.current += 1;
      if (!signedIn) {
        setCount(0);
        return;
      }
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
    window.addEventListener(PREVIEW_COMMERCE_CHANGED, sync);
    return () => {
      window.removeEventListener(STOREFRONT_WISHLIST_CHANGED, sync);
      window.removeEventListener(PREVIEW_COMMERCE_CHANGED, sync);
    };
  }, [load, signedIn]);

  const href = signedIn ? "/wishlist" : customerLoginHref("/wishlist");
  const handleClick = !signedIn || directNavigation ? (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(signedIn
      ? storefrontHrefWithCurrentContext("/wishlist")
      : customerLoginHrefWithCurrentContext("/wishlist"));
  } : undefined;
  const accessibleLabel = `${t("Wishlist")}${count > 0 ? ` (${count})` : ""}`;

  if (displayMode === "nav") {
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={`group relative flex shrink-0 items-center gap-2 px-1 text-xs font-bold transition ${active ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`}
        aria-label={accessibleLabel}
      >
        <span>{t("Wishlist")}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2a1930] px-1.5 text-[10px] font-black leading-none text-[#f3c96f] shadow-[0_2px_8px_rgba(42,25,48,0.24)] ring-1 ring-[#f3c96f]/70" aria-label={`${count} ${t("selected")}`}>
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
      </Link>
    );
  }

  if (displayMode === "mobile-nav") {
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[var(--header-soft)] text-[var(--header-primary)]" : "text-slate-700 hover:bg-slate-50 hover:text-[var(--header-primary)]"}`}
        aria-label={accessibleLabel}
      >
        <span>{t("Wishlist")}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1.5 text-[10px] font-extrabold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={displayMode === "atelier"
        ? "aurelia-saved-link group relative hidden items-center text-slate-950 transition lg:flex"
        : "group relative hidden items-center gap-2 text-slate-950 transition hover:text-[var(--header-primary)] lg:flex"}
      aria-label={accessibleLabel}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <HeartIcon />
        {count > 0 ? (
          <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      {displayMode === "atelier" ? (
        <span className="aurelia-utility-label hidden flex-col xl:flex">
          <span>{t("Saved pieces")}</span>
          <small>{count > 0 ? `${count} ${t("selected")}` : t("Your edit")}</small>
        </span>
      ) : <span className="hidden text-xs font-extrabold xl:inline">{t("Wishlist")}</span>}
    </Link>
  );
}
