import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useAnnouncements } from '@/components/announcements/AnnouncementsContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function AnnouncementSettingsPage() {
  const { settings, setSettings } = useAnnouncements();

  return (
    <ResourcePanel title="Announcement settings">
      <div className="grid max-w-md gap-3 p-3">
        <div>
          <label className={setLbl}>Max active announcements (banner slots)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={settings.maxActiveAnnouncements}
            onChange={(e) =>
              setSettings((s) => ({ ...s, maxActiveAnnouncements: Number(e.target.value) || 1 }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>Banner display duration (seconds)</label>
          <input
            type="number"
            min={5}
            className={setInp}
            value={settings.bannerDisplayDurationSec}
            onChange={(e) =>
              setSettings((s) => ({ ...s, bannerDisplayDurationSec: Number(e.target.value) || 5 }))
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="ae"
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300"
            checked={settings.autoExpire}
            onChange={(e) => setSettings((s) => ({ ...s, autoExpire: e.target.checked }))}
          />
          <label htmlFor="ae" className="text-xs text-slate-800">
            Auto-expire when end date passes (hide from dashboards)
          </label>
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary} onClick={() => window.alert('Saved to session (demo).')}>
          Save settings
        </button>
      </div>
    </ResourcePanel>
  );
}
