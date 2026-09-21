"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  THEME_PREVIEW_LANGUAGE_SYNC_MESSAGE,
  THEME_PREVIEW_MESSAGE,
  THEME_PREVIEW_READY_MESSAGE,
  decodeThemePreviewState,
  previewLanguageContract,
  THEME_PREVIEW_STATE_PARAM,
} from "@/lib/theme-preview-contract";

type Props = {
  enabled: boolean;
  language: string;
  direction: "ltr" | "rtl";
  missingTranslations: string[];
};

export default function PreviewBridge({ enabled, language, direction, missingTranslations }: Props) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.type !== THEME_PREVIEW_MESSAGE) return;
      const state = decodeThemePreviewState(encodeURIComponent(JSON.stringify(event.data.state ?? {})));
      const nextLanguage = state.languageContract?.languageCode || state.languageCode;
      const url = new URL(window.location.href);
      url.searchParams.set(THEME_PREVIEW_STATE_PARAM, encodeURIComponent(JSON.stringify(state)));
      if (nextLanguage) url.searchParams.set("previewLanguage", nextLanguage);
      window.history.replaceState(window.history.state, "", url);
      router.refresh();
    };
    window.addEventListener("message", onMessage);
    const languageContract = previewLanguageContract(language);
    window.parent.postMessage({ type: THEME_PREVIEW_READY_MESSAGE, languageContract }, "*");
    window.parent.postMessage({ type: THEME_PREVIEW_LANGUAGE_SYNC_MESSAGE, languageContract }, "*");
    window.parent.postMessage({
      type: "theme-preview-diagnostics",
      language,
      direction,
      languageContract,
      missingTranslations,
      fallbackCount: missingTranslations.length,
      translationComplete: missingTranslations.length === 0,
    }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, language, direction, missingTranslations, router]);
  return null;
}
