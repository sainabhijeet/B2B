import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { Copy, ExternalLink, QrCode, RefreshCw, RotateCcw } from "lucide-react";
import {
  encodeThemePreviewState,
  previewLanguageContract,
  THEME_PREVIEW_MESSAGE,
  THEME_PREVIEW_READY_MESSAGE,
  type ThemePreviewState,
} from "@/lib/themePreviewContract";

type Diagnostics = {
  language?: string;
  direction?: "ltr" | "rtl";
  missingTranslations?: string[];
  translationComplete?: boolean;
};

type Props = {
  enabled: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewUrl: string;
  page: "home" | "category" | "product";
  language: string;
  state: ThemePreviewState;
  onStateChange: (state: ThemePreviewState) => void;
  onRefresh: () => void;
  compareMode: boolean;
  onCompareModeChange: (value: boolean) => void;
  zoom: number;
  onZoomChange: (value: number) => void;
};

const LANGUAGES = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["zh", "Chinese"],
  ["ar", "Arabic"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
  ["gu", "Gujarati"],
  ["ur", "Urdu"],
  ["ru", "Russian"],
  ["ja", "Japanese"],
] as const;

export default function LiveThemeEditorControls({
  enabled,
  iframeRef,
  previewUrl,
  page,
  language,
  state,
  onStateChange,
  onRefresh,
  compareMode,
  onCompareModeChange,
  zoom,
  onZoomChange,
}: Props) {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({});
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "theme-preview-diagnostics") setDiagnostics(event.data as Diagnostics);
      if (event.data?.type === THEME_PREVIEW_READY_MESSAGE && state) {
        iframeRef.current?.contentWindow?.postMessage({ type: THEME_PREVIEW_MESSAGE, state }, "*");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled, iframeRef, state]);

  const shareUrl = useMemo(() => {
    if (!previewUrl) return "";
    const url = new URL(previewUrl);
    url.searchParams.set("previewState", encodeThemePreviewState({ ...state, page }));
    url.searchParams.set("previewMode", "1");
    return url.toString();
  }, [page, previewUrl, state]);

  if (!enabled) return null;

  const update = (patch: ThemePreviewState) => {
    const requestedLanguage = patch.languageCode || patch.languageContract?.languageCode || state.languageCode || language;
    const next = {
      ...state,
      ...patch,
      languageCode: requestedLanguage,
      languageContract: previewLanguageContract(requestedLanguage),
      page,
    };
    onStateChange(next);
    iframeRef.current?.contentWindow?.postMessage({ type: THEME_PREVIEW_MESSAGE, state: next }, "*");
  };

  const updateToken = (key: string, value: string) => {
    update({ tokenOverrides: { ...(state.tokenOverrides ?? {}), [key]: value } });
  };

  const reset = () => {
    const next = {
      languageCode: language,
      languageContract: previewLanguageContract(language),
      page,
    };
    onStateChange(next);
    iframeRef.current?.contentWindow?.postMessage({ type: THEME_PREVIEW_MESSAGE, state: next }, "*");
  };

  return (
    <div className="mb-2 space-y-2 rounded-md border border-indigo-100 bg-indigo-50/60 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-indigo-900">Live editor</span>
        <label className="flex items-center gap-1 text-slate-700">
          Language
          <select value={state.languageCode ?? language} onChange={(e) => update({ languageCode: e.target.value })} className="rounded border border-slate-300 bg-white px-1.5 py-1">
            {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-slate-700">
          Zoom
          <input type="range" min="50" max="125" step="5" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} />
          <span>{zoom}%</span>
        </label>
        <button type="button" onClick={() => onCompareModeChange(!compareMode)} className={`rounded px-2 py-1 font-medium ${compareMode ? "bg-indigo-700 text-white" : "bg-white text-indigo-700"}`}>Compare</button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-slate-700"><RotateCcw className="h-3 w-3" />Reset</button>
        <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-slate-700"><RefreshCw className="h-3 w-3" />Refresh</button>
        <a href={shareUrl || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-indigo-700"><ExternalLink className="h-3 w-3" />Share</a>
        <button type="button" onClick={() => setShowQr(!showQr)} className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-indigo-700"><QrCode className="h-3 w-3" />QR</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-slate-700">Primary <input type="color" value={state.tokenOverrides?.primary ?? "#4f46e5"} onChange={(e) => updateToken("primary", e.target.value)} /></label>
        <label className="flex items-center gap-1 text-slate-700">Secondary <input type="color" value={state.tokenOverrides?.secondary ?? "#f59e0b"} onChange={(e) => updateToken("secondary", e.target.value)} /></label>
        <label className="flex items-center gap-1 text-slate-700">Radius <input className="w-16 rounded border px-1 py-1" value={state.tokenOverrides?.borderRadius ?? "16px"} onChange={(e) => updateToken("borderRadius", e.target.value)} /></label>
        <span className={`rounded px-2 py-1 font-medium ${diagnostics.translationComplete === false ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {diagnostics.translationComplete === false ? `${diagnostics.missingTranslations?.length ?? 0} missing translations` : "Publish-ready language"}
        </span>
        {diagnostics.direction === "rtl" ? <span className="rounded bg-sky-100 px-2 py-1 text-sky-800">RTL active</span> : null}
      </div>
      {showQr && shareUrl ? (
        <div className="flex items-center gap-3 rounded bg-white p-2">
          <img src={`https://quickchart.io/qr?size=180&text=${encodeURIComponent(shareUrl)}`} alt="QR code for theme preview" className="h-28 w-28" />
          <button type="button" onClick={() => void navigator.clipboard?.writeText(shareUrl)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-slate-700"><Copy className="h-3 w-3" />Copy link</button>
        </div>
      ) : null}
    </div>
  );
}
