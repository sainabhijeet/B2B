import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourcePanel } from "@/components/ui/ResourcePanel";
import { ApiError } from "@/lib/apiClient";
import {
  fetchDistributorThemeGallery,
  fetchSelectedThemeInfo,
  fetchThemeCatalog,
  fetchThemeChangeHistory,
  postDistributorThemeSelect,
  type DistributorThemeGalleryRow,
  type ThemeChangeEntry,
  type ThemeComboPackRow,
} from "@/lib/websiteBuilderApi";

type Mode = "web" | "mobile" | "combo";

type PendingSelect =
  | { kind: "web"; id: string; label: string }
  | { kind: "mobile"; id: string; label: string }
  | { kind: "combo"; id: string; label: string };

function ThemePreviewImage({
  src,
  title,
  unavailableLabel = "Preview unavailable",
}: {
  src: string;
  title: string;
  unavailableLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 p-6 text-center">
        <div className="mb-2 rounded-full bg-white p-3 shadow-sm">
          <span className="block h-5 w-5 rounded bg-gradient-to-br from-indigo-400 to-violet-600" />
        </div>
        <p className="text-xs font-medium text-slate-600">{title}</p>
        <p className="mt-1 text-[10px] text-slate-400">{unavailableLabel}</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${title} storefront preview`}
      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.02]"
      onError={() => setFailed(true)}
    />
  );
}

export function ThemeChangePage() {
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof fetchSelectedThemeInfo>>>(null);
  const [webRows, setWebRows] = useState<DistributorThemeGalleryRow[]>([]);
  const [mobileRows, setMobileRows] = useState<DistributorThemeGalleryRow[]>([]);
  const [combos, setCombos] = useState<ThemeComboPackRow[]>([]);
  const [history, setHistory] = useState<ThemeChangeEntry[]>([]);
  const [mode, setMode] = useState<Mode>("web");
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
  const [pending, setPending] = useState<PendingSelect | null>(null);
  const tr = useCallback((text: string) => text, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cur, catalog, hist, webGallery, mobileGallery] = await Promise.all([
        fetchSelectedThemeInfo(),
        fetchThemeCatalog(),
        fetchThemeChangeHistory(),
        fetchDistributorThemeGallery("WEB"),
        fetchDistributorThemeGallery("MOBILE"),
      ]);
      setCurrent(cur);
      setWebRows(webGallery);
      setMobileRows(mobileGallery);
      setCombos(catalog.combos);
      setHistory(hist.entries);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load themes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("website-builder:preview-mode", { detail: { mode } }));
  }, [mode]);

  const currentComboId = useMemo(() => {
    if (current?.comboId) return current.comboId;
    const webId = current?.webTheme?.id ?? current?.id;
    const mobileId = current?.mobileTheme?.id;
    if (!webId) return "";
    const hit = combos.find((c) => c.webThemeId === webId && (!mobileId || c.mobileThemeId === mobileId));
    return hit?.id ?? "";
  }, [combos, current?.comboId, current?.id, current?.mobileTheme?.id, current?.webTheme?.id]);

  const activeWebId = current?.webTheme?.id ?? current?.id ?? "";
  const activeMobileId = current?.mobileTheme?.id ?? "";
  const sortedWebRows = useMemo(
    () => [...webRows].sort((a, b) => Number(b.id === activeWebId) - Number(a.id === activeWebId)),
    [activeWebId, webRows],
  );
  const sortedMobileRows = useMemo(
    () => [...mobileRows].sort((a, b) => Number(b.id === activeMobileId) - Number(a.id === activeMobileId)),
    [activeMobileId, mobileRows],
  );

  useEffect(() => {
    if (mode !== "mobile" && mode !== "combo") {
      window.dispatchEvent(new CustomEvent("website-builder:mobile-preview-hint", { detail: null }));
      return;
    }
    const active = sortedMobileRows.find((row) => row.id === activeMobileId) ?? sortedMobileRows[0] ?? null;
    window.dispatchEvent(
      new CustomEvent("website-builder:mobile-preview-hint", {
        detail: active
          ? {
              themeName: active.theme_name,
              slug: active.storefront_key ?? null,
              previewImage: active.preview_image,
            }
          : null,
      }),
    );
  }, [activeMobileId, mode, sortedMobileRows]);

  async function applySelect(p: PendingSelect) {
    setPending(null);
    setSelectingId(p.id);
    setError(null);
    setMessage(null);
    try {
      if (p.kind === "combo") {
        await postDistributorThemeSelect({ combo_id: p.id });
      } else {
        await postDistributorThemeSelect({ theme_id: p.id });
      }
      setMessage("Theme updated. Rebuild may run in the background - refresh the storefront after a minute if needed.");
      await load();
      window.dispatchEvent(new CustomEvent("website-builder:preview-refresh"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not apply theme.");
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr("Storefront theme")}
        description={tr("Preview themes like a catalog, then apply. Web themes can auto-pair mobile when a combo exists; combo packs set both together.")}
      />

      {loading ? (
        <p className="text-sm text-slate-600">{tr("Loading")}...</p>
      ) : (
        <ResourcePanel title={tr("Currently active")}>
          <div className="space-y-1 p-3 text-sm text-slate-800">
            <p>
              <span className="font-medium text-slate-900">{tr("Web theme")}:</span>{" "}
              {current?.webTheme ?? current
                ? `${(current.webTheme ?? current).themeName}${(current.webTheme ?? current).slug ? ` (${(current.webTheme ?? current).slug})` : ""}`
                : tr("None assigned yet")}
            </p>
            <p>
              <span className="font-medium text-slate-900">{tr("Mobile theme")}:</span>{" "}
              {current?.mobileTheme
                ? `${current.mobileTheme.themeName}${current.mobileTheme.slug ? ` (${current.mobileTheme.slug})` : ""}`
                : tr("None assigned yet")}
            </p>
            {currentComboId ? (
              <p className="text-xs text-slate-600">
                {tr("From combo")}:{" "}
                <span className="font-mono">{combos.find((c) => c.id === currentComboId)?.name ?? currentComboId}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500">{tr("No combo pack - mobile theme may be set separately if available.")}</p>
            )}
          </div>
        </ResourcePanel>
      )}

      <ResourcePanel title={tr("Theme gallery")}>
        <div className="space-y-4 p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="tm" checked={mode === "web"} onChange={() => setMode("web")} />
              {tr("Web themes")}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="tm" checked={mode === "mobile"} onChange={() => setMode("mobile")} />
              {tr("Mobile themes")}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="tm" checked={mode === "combo"} onChange={() => setMode("combo")} />
              {tr("Web + mobile combo packs")}
            </label>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-800">{tr(message)}</p> : null}

          {mode === "web" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedWebRows.map((t) => {
                const isActive = t.id === activeWebId;
                const busy = selectingId === t.id;
                return (
                  <li
                    key={t.id}
                    className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow ${
                      isActive ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <button
                      type="button"
                      className="group relative block aspect-[16/10] w-full overflow-hidden bg-slate-100 text-left"
                      onClick={() =>
                        t.preview_image
                          ? setLightbox({ url: t.preview_image, title: tr(t.theme_name) })
                          : undefined
                      }
                      aria-label={`${tr("Preview")} ${tr(t.theme_name)}`}
                    >
                      <ThemePreviewImage src={t.preview_image} title={tr(t.theme_name)} unavailableLabel={tr("Preview unavailable")} />
                      <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                        {tr("Click to enlarge")}
                      </span>
                      {isActive ? (
                        <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {tr("Active")}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{tr(t.theme_name)}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            v{t.version ?? "1.0"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {tr(t.theme_family || "General")} - {tr(t.base_layout.replace(/_/g, " "))}
                        </p>
                        {t.storefront_key ? (
                          <p className="mt-1 font-mono text-[10px] text-slate-400">{t.storefront_key}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={isActive || busy || loading}
                        onClick={() =>
                          setPending({
                            kind: "web",
                            id: t.id,
                            label: tr(t.theme_name),
                          })
                        }
                        className="mt-auto rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {busy ? `${tr("Applying")}...` : isActive ? tr("Currently active") : tr("Select")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : mode === "mobile" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedMobileRows.map((t) => {
                const isActive = t.id === activeMobileId;
                const busy = selectingId === t.id;
                return (
                  <li
                    key={t.id}
                    className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow ${
                      isActive ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <button
                      type="button"
                      className="group relative block aspect-[9/16] w-full overflow-hidden bg-slate-100 text-left"
                      onClick={() =>
                        t.preview_image
                          ? setLightbox({ url: t.preview_image, title: tr(t.theme_name) })
                          : undefined
                      }
                      aria-label={`${tr("Preview")} ${tr(t.theme_name)}`}
                    >
                      <ThemePreviewImage src={t.preview_image} title={tr(t.theme_name)} unavailableLabel={tr("Preview unavailable")} />
                      <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                        {tr("Mobile")}
                      </span>
                      {isActive ? (
                        <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {tr("Active")}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{tr(t.theme_name)}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            v{t.version ?? "1.0"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {tr(t.theme_family || "General")} - {tr(t.base_layout.replace(/_/g, " "))}
                        </p>
                        {t.storefront_key ? (
                          <p className="mt-1 font-mono text-[10px] text-slate-400">{t.storefront_key}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={isActive || busy || loading}
                        onClick={() =>
                          setPending({
                            kind: "mobile",
                            id: t.id,
                            label: tr(t.theme_name),
                          })
                        }
                        className="mt-auto rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {busy ? `${tr("Applying")}...` : isActive ? tr("Currently active") : tr("Select mobile theme")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {combos.map((c) => {
                const isActive = c.id === currentComboId;
                const busy = selectingId === c.id;
                const preview = (c.previewImage ?? "").trim();
                return (
                  <li
                    key={c.id}
                    className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
                      isActive ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <button
                      type="button"
                      className="relative block aspect-[4/5] w-full overflow-hidden bg-slate-100 text-left"
                      onClick={() =>
                        preview ? setLightbox({ url: preview, title: tr(c.name) }) : undefined
                      }
                      aria-label={`${tr("Preview")} ${tr(c.name)}`}
                    >
                      {preview ? (
                        <img src={preview} alt="" className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          {tr("No preview yet")}
                        </div>
                      )}
                      {isActive ? (
                        <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {tr("Active")}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <p className="font-medium text-slate-900">{tr(c.name)}</p>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <p>
                          <span className="font-medium text-slate-700">{tr("Web")}:</span>{" "}
                          {c.webTheme?.themeName ? tr(c.webTheme.themeName) : c.webThemeId.slice(0, 8)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">{tr("Mobile")}:</span>{" "}
                          {c.mobileTheme?.themeName ? tr(c.mobileTheme.themeName) : c.mobileThemeId.slice(0, 8)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isActive || busy || loading}
                        onClick={() =>
                          setPending({
                            kind: "combo",
                            id: c.id,
                            label: tr(c.name),
                          })
                        }
                        className="mt-auto rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {busy ? `${tr("Applying")}...` : isActive ? tr("Currently active") : tr("Select")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ResourcePanel>

      {pending ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-w-md rounded-lg bg-white p-4 shadow-xl">
            <p className="text-sm font-medium text-slate-900">{tr("Apply this theme?")}</p>
            <p className="mt-1 text-sm text-slate-600">{pending.label}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setPending(null)}
              >
                {tr("Cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                onClick={() => void applySelect(pending)}
              >
                {tr("Apply")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          aria-label="Close preview"
        >
          <span className="sr-only">{tr("Close")}</span>
          <div className="max-h-[92vh] max-w-5xl overflow-auto rounded-lg bg-white p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="px-2 pb-2 text-left text-sm font-medium text-slate-800">{lightbox.title}</p>
            <img src={lightbox.url} alt="" className="max-h-[85vh] w-auto max-w-full object-contain" />
            <p className="px-2 pt-2 text-center text-xs text-slate-500">{tr("Click outside to close")}</p>
          </div>
        </button>
      ) : null}

      <ResourcePanel title={tr("Change history (last 100)")}>
        <div className="overflow-x-auto p-2">
          {history.length === 0 ? (
            <p className="p-2 text-sm text-slate-600">{tr("No theme changes recorded yet.")}</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2 font-medium">{tr("When (UTC)")}</th>
                  <th className="py-2 pr-2 font-medium">{tr("By")}</th>
                  <th className="py-2 pr-2 font-medium">{tr("From")}</th>
                  <th className="py-2 font-medium">{tr("To")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2 font-mono text-slate-700">{h.createdAt.slice(0, 19).replace("T", " ")}</td>
                    <td className="py-2 pr-2 text-slate-700">{h.changedByEmail ?? h.changedByUserId ?? "â€”"}</td>
                    <td className="py-2 pr-2 text-slate-600">
                      <div>{h.previous.webLabel ?? "â€”"}</div>
                      {h.previous.mobileLabel ? <div className="text-slate-500">{h.previous.mobileLabel}</div> : null}
                      {h.previous.comboName ? <div className="text-slate-500">{tr("Combo")}: {h.previous.comboName}</div> : null}
                    </td>
                    <td className="py-2 text-slate-800">
                      <div>{h.current.webLabel ?? "â€”"}</div>
                      {h.current.mobileLabel ? <div className="text-slate-600">{h.current.mobileLabel}</div> : null}
                      {h.current.comboName ? <div className="text-slate-600">{tr("Combo")}: {h.current.comboName}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ResourcePanel>
    </div>
  );
}




