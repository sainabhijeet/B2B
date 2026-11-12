"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StorefrontLoadingOverlay from "@/components/StorefrontLoadingOverlay";
const LOADER_SAFETY_TIMEOUT_MS = 10_000;
const LOADER_SHOW_DELAY_MS = 180;
const THEME_PREVIEW_QUERY_KEYS = [
  "tenantId",
  "tenant",
  "wbPreview",
  "previewMode",
  "previewLanguage",
  "previewState",
  "previewPrimaryColor",
  "previewSecondaryColor",
  "previewFontFamily",
  "previewBorderRadius",
] as const;

function isThemePreviewUrl(url: URL): boolean {
  return url.searchParams.get("previewMode") === "1" || url.searchParams.has("wbPreview");
}

function preserveThemePreviewQuery(destination: URL, current: URL): boolean {
  if (!isThemePreviewUrl(current) || destination.origin !== current.origin) return false;
  let changed = false;
  for (const key of THEME_PREVIEW_QUERY_KEYS) {
    if (destination.searchParams.has(key)) continue;
    const value = current.searchParams.get(key);
    if (value === null) continue;
    destination.searchParams.set(key, value);
    changed = true;
  }
  if (destination.searchParams.get("previewMode") !== "1") {
    destination.searchParams.set("previewMode", "1");
    changed = true;
  }
  return changed;
}

function NavigationLoader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Loading page…");
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    // Once the destination route commits, its content is ready to display.
    // Waiting for a child effect here could leave the full-screen overlay up
    // until the safety timeout even though the product page had rendered.
    setLoading(false);
    setVisible(false);
  }, [routeKey]);

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
      const previewQueryAdded = preserveThemePreviewQuery(destination, current);
      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname && destination.search === current.search)
      ) {
        return;
      }

      const isProductPage = destination.pathname.startsWith("/product/");
      setMessage(isProductPage ? "Loading product details…" : "Loading page…");
      setLoading(true);
      if (previewQueryAdded) {
        event.preventDefault();
        event.stopPropagation();
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      }
    }

    function handleSubmit(event: SubmitEvent) {
      if (!(event.target instanceof HTMLFormElement)) return;
      const form = event.target;
      if ((form.method || "get").toLowerCase() !== "get") return;
      const current = new URL(window.location.href);
      if (!isThemePreviewUrl(current)) return;
      for (const key of THEME_PREVIEW_QUERY_KEYS) {
        if (form.elements.namedItem(key)) continue;
        const value = current.searchParams.get(key);
        if (value === null) continue;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        input.dataset.themePreviewQuery = "true";
        form.appendChild(input);
      }
      if (!form.elements.namedItem("previewMode")) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "previewMode";
        input.value = "1";
        input.dataset.themePreviewQuery = "true";
        form.appendChild(input);
      }
    }

    function stopLoading() {
      setLoading(false);
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("pageshow", stopLoading);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("pageshow", stopLoading);
    };
  }, [router]);

  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    // Do not flash a global loader for fast client-side transitions.
    const showTimer = window.setTimeout(() => setVisible(true), LOADER_SHOW_DELAY_MS);
    return () => window.clearTimeout(showTimer);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, LOADER_SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  if (!loading || !visible) return null;
  return <StorefrontLoadingOverlay message={message} />;
}

export default function StorefrontNavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoader />
    </Suspense>
  );
}
