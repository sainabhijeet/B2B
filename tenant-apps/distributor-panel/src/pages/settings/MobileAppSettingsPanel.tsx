import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import {
  fetchMobileAppSettings,
  putMobileAppSettings,
  type MobileAppSettings,
} from "@/lib/distributorPanelApi";
import { fetchPlatformLanguages } from "@/lib/platformLanguages";

/** App config for consumer mobile / storefront (`GET|PUT /distributor/app-config`). */
export function MobileAppSettingsPanel() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["distributor", "app-config"],
    queryFn: fetchMobileAppSettings,
  });
  const languages = useQuery({
    queryKey: ["platform", "languages", "active"],
    queryFn: fetchPlatformLanguages,
  });
  const m = useMutation({
    mutationFn: (patch: Partial<MobileAppSettings>) => putMobileAppSettings(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["distributor", "app-config"] });
      const previous = qc.getQueryData<MobileAppSettings>(["distributor", "app-config"]);
      if (previous) {
        qc.setQueryData<MobileAppSettings>(["distributor", "app-config"], {
          ...previous,
          ...patch,
          allowGuestCart: patch.allowGuestAccess === false ? false : (patch.allowGuestCart ?? previous.allowGuestCart),
          showPricesToGuest: patch.allowGuestAccess === false ? false : (patch.showPricesToGuest ?? previous.showPricesToGuest),
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        qc.setQueryData(["distributor", "app-config"], context.previous);
      }
    },
    onSuccess: (settings, patch) => {
      if (patch.selectedLanguageCode) {
        window.dispatchEvent(
          new CustomEvent("website-builder:language-change", {
            detail: { selectedLanguageCode: settings.selectedLanguageCode || patch.selectedLanguageCode },
          }),
        );
        window.dispatchEvent(new CustomEvent("website-builder:preview-refresh"));
      }
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["distributor", "app-config"] }),
  });

  const s = q.data;
  const languageOptions = languages.data?.length
    ? languages.data
    : [
        { name: "English", code: "en", direction: "ltr" as const, isDefault: true },
        { name: "Hindi", code: "hi", direction: "ltr" as const, isDefault: false },
        { name: "French", code: "fr", direction: "ltr" as const, isDefault: false },
        { name: "Spanish", code: "es", direction: "ltr" as const, isDefault: false },
        { name: "Arabic", code: "ar", direction: "rtl" as const, isDefault: false },
        { name: "German", code: "de", direction: "ltr" as const, isDefault: false },
        { name: "Chinese", code: "zh", direction: "ltr" as const, isDefault: false },
        { name: "Gujarati", code: "gu", direction: "ltr" as const, isDefault: false },
      ];
  const mutationMessage = m.isError ? friendlySettingsError(m.error) : null;

  return (
    <div className="space-y-4">
      {q.isLoading && <p className="text-sm text-slate-600">Loading app config…</p>}
      {q.isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {(q.error as Error)?.message ?? "Failed to load settings. Is the backend running and migration applied?"}
        </p>
      )}
      {s && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <div className="border-b border-slate-200/80 pb-4">
            <label className="block text-sm font-semibold text-slate-900">Website language</label>
            <p className="mt-1 text-sm text-slate-600">
              Select the language customers will see on your website and mobile app.
            </p>
            <select
              className="mt-2 w-full max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={s.selectedLanguageCode || "en"}
              disabled={m.isPending || languages.isLoading}
              onChange={(e) => m.mutate({ selectedLanguageCode: e.target.value })}
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code}){lang.isDefault ? " - default" : ""}
                </option>
              ))}
            </select>
            {m.isPending ? <p className="mt-1 text-xs text-slate-500">Saving...</p> : null}
            {mutationMessage ? <p className="mt-1 text-xs text-red-700">{mutationMessage}</p> : null}
            {languages.isError ? (
              <p className="mt-1 text-xs text-amber-800">Could not load language list. English fallback is available.</p>
            ) : null}
          </div>
          <details className="group rounded border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900">
              Advanced mobile app controls
              <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-4 border-t border-slate-200 px-4 py-4">
              <ToggleRow
                label="Allow visitors to open app without login"
                description="Off means retailers must sign in before seeing the catalog."
                checked={s.allowGuestAccess}
                disabled={m.isPending}
                onChange={(v) => m.mutate({ allowGuestAccess: v })}
              />
              <ToggleRow
                label="Show prices before login"
                description="Off keeps prices hidden until retailer login."
                checked={s.showPricesToGuest}
                disabled={m.isPending || !s.allowGuestAccess}
                onChange={(v) => m.mutate({ showPricesToGuest: v })}
              />
              <ToggleRow
                label="Allow cart before login"
                description="Visitors can add items, but still need login to place an order."
                checked={s.allowGuestCart}
                disabled={m.isPending || !s.allowGuestAccess}
                onChange={(v) => m.mutate({ allowGuestCart: v })}
              />
              <ToggleRow
                label="Show repeat order"
                description="Controls whether retailers can see old orders and repeat them."
                checked={s.enableRepeatOrder}
                disabled={m.isPending}
                onChange={(v) => m.mutate({ enableRepeatOrder: v })}
              />
              <ToggleRow
                label="Show credit balance"
                description="Controls whether signed-in retailers can view credit details."
                checked={s.enableCreditView}
                disabled={m.isPending}
                onChange={(v) => m.mutate({ enableCreditView: v })}
              />
              <ToggleRow
                label="Enable notifications"
                description="Allows future push and in-app alerts."
                checked={s.enableNotifications}
                disabled={m.isPending}
                onChange={(v) => m.mutate({ enableNotifications: v })}
              />
              <div className="border-b border-slate-200/80 pb-4">
                <label className="block text-sm font-medium text-slate-900">Mobile home layout</label>
                <p className="mt-0.5 text-xs text-slate-600">Choose grid or list layout in the mobile app.</p>
                <select
                  className="mt-2 w-full max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  value={s.defaultHomeLayout}
                  disabled={m.isPending}
                  onChange={(e) =>
                    m.mutate({
                      defaultHomeLayout: e.target.value === "list" ? "list" : "grid",
                    })
                  }
                >
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </select>
              </div>
              <ToggleRow
                label="Show app banner"
                description="Controls the hero banner on the mobile home screen."
                checked={s.showBanner}
                disabled={m.isPending}
                onChange={(v) => m.mutate({ showBanner: v })}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function friendlySettingsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("selectedLanguageCode") && message.includes("should not exist")) {
    return "Backend update pending. Restart the backend server and run migration, then select language again.";
  }
  return message || "Could not save setting.";
}

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b border-slate-200/80 pb-4 last:border-0 last:pb-0">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-900">{props.label}</span>
        <span className="mt-0.5 block text-xs text-slate-600">{props.description}</span>
      </span>
    </label>
  );
}
