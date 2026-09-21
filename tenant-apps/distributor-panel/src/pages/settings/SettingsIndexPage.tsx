import { MobileAppSettingsPanel } from "@/pages/settings/MobileAppSettingsPanel";
import { Globe2 } from "lucide-react";

/**
 * Single Settings screen (mobile toggles live here so `/settings` stays one route — avoids blank child routes if `App.tsx` is reverted).
 */
export function SettingsIndexPage() {
  return (
    <div className="mx-auto min-h-[50vh] max-w-2xl space-y-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage how your customer website and app behave.
        </p>
      </div>

      <section id="storefront" className="scroll-mt-6">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <Globe2 className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <h2 className="text-base font-semibold">Website & app storefront</h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Change the website language here. Mobile app controls are kept in advanced settings.
        </p>
        <MobileAppSettingsPanel />
        <p className="mt-3 text-xs text-slate-500">
          After changing language or mobile theme, generate a new APK from the dashboard so the downloadable app uses the latest settings.
        </p>
      </section>
    </div>
  );
}
