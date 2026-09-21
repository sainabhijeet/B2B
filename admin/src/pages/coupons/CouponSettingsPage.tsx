import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useCoupons } from '@/components/coupons/CouponContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function CouponSettingsPage() {
  const { settings, setSettings } = useCoupons();

  return (
    <div className="space-y-4">
      <ResourcePanel title="Global rules">
        <div className="max-w-lg space-y-4 p-3">
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Enable subscription coupons
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.allowStacking}
              onChange={(e) => setSettings((s) => ({ ...s, allowStacking: e.target.checked }))}
            />
            Allow multiple coupons on one checkout
          </label>
          <div>
            <label className={setLbl}>Max discount cap (% of invoice)</label>
            <input
              type="number"
              min={0}
              max={100}
              className={setInp}
              value={settings.maxDiscountPercent}
              onChange={(e) =>
                setSettings((s) => ({ ...s, maxDiscountPercent: Number(e.target.value) || 0 }))
              }
            />
            <p className="mt-1 text-[10px] text-slate-500">Stacks with flat caps in billing engine.</p>
          </div>
          <div>
            <label className={setLbl}>Default expiry (days from creation)</label>
            <input
              type="number"
              min={1}
              className={setInp}
              value={settings.defaultExpiryDays}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaultExpiryDays: Number(e.target.value) || 1 }))
              }
            />
          </div>
          <button
            type="button"
            className={adminBtnPrimary}
            onClick={() => window.alert('Settings saved.')}
          >
            Save settings
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Distributor coupons (future / separate product)">
        <div className="space-y-3 px-3 py-3 text-xs text-slate-700">
          <p>
            <strong>Distributor panel</strong> will own creation of customer-facing order discounts. Super Admin does
            not create those codes here — only monitors aggregate impact.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/subscriptions/coupons/distributor-analytics" className={adminBtnSecondary}>
              Distributor coupon analytics
            </Link>
            <Link to="/subscriptions/coupons/distributor-usage" className={adminBtnSecondary}>
              Distributor coupon usage
            </Link>
          </div>
          <p className="text-[10px] text-slate-500">
            Rule: Super Admin coupons → subscription discount. Distributor coupons → product order discount.
          </p>
        </div>
      </ResourcePanel>
    </div>
  );
}
