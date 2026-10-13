"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import StorefrontLoadingOverlay from "@/components/StorefrontLoadingOverlay";
import {
  STOREFRONT_PRODUCT_READY_EVENT,
  type StorefrontProductReadyDetail,
} from "@/lib/storefront-loading-events";

const LOADER_SAFETY_TIMEOUT_MS = 20_000;

function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading page…");
  const pendingProductPathRef = useRef<string | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (pendingProductPathRef.current === pathname) return;
    pendingProductPathRef.current = null;
    setLoading(false);
  }, [pathname, routeKey]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        link.hasAttribute("download") ||
        link.dataset.noNavigationLoader === "true" ||
        (link.target && link.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname && destination.search === current.search)
      ) {
        return;
      }

      const isProductPage = destination.pathname.startsWith("/product/");
      pendingProductPathRef.current = isProductPage ? destination.pathname : null;
      setMessage(isProductPage ? "Loading product details…" : "Loading page…");
      setLoading(true);
    }

    function stopLoading() {
      pendingProductPathRef.current = null;
      setLoading(false);
    }

    function handleProductReady(event: Event) {
      const readyPath = (event as CustomEvent<StorefrontProductReadyDetail>).detail?.path;
      if (!readyPath || readyPath !== pendingProductPathRef.current) return;
      stopLoading();
    }

    document.addEventListener("click", handleClick);
    window.addEventListener(STOREFRONT_PRODUCT_READY_EVENT, handleProductReady);
    window.addEventListener("pageshow", stopLoading);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener(STOREFRONT_PRODUCT_READY_EVENT, handleProductReady);
      window.removeEventListener("pageshow", stopLoading);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => {
      pendingProductPathRef.current = null;
      setLoading(false);
    }, LOADER_SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  if (!loading) return null;
  return <StorefrontLoadingOverlay message={message} />;
}

export default function StorefrontNavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoader />
    </Suspense>
  );
}
