import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useCoupons } from '@/components/coupons/CouponContext';
import type { CouponCampaignRow } from '@/lib/couponModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function CouponCampaignsPage() {
  const { campaigns, setCampaigns, coupons } = useCoupons();
  const [name, setName] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const sorted = [...campaigns].sort((a, b) => b.startDate.localeCompare(a.startDate));

  function toggleCode(code: string) {
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !start || !end || codes.length === 0) {
      window.alert('Fill name, dates, and pick at least one coupon.');
      return;
    }
    const row: CouponCampaignRow = {
      campaignId: `cmp-${Date.now().toString(36)}`,
      name: name.trim(),
      couponCodes: [...codes],
      startDate: start,
      endDate: end,
    };
    setCampaigns((list) => [row, ...list]);
    setName('');
    setCodes([]);
    setStart('');
    setEnd('');
  }

  const maxTrend = Math.max(...sorted.map((c) => c.couponCodes.length), 1);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Coupon campaigns">
        <DataTable
          columns={[
            { id: 'n', header: 'Campaign name', cell: (r: CouponCampaignRow) => r.name },
            {
              id: 'c',
              header: 'Coupons included',
              cell: (r: CouponCampaignRow) => (
                <span className="font-mono text-[10px]">{r.couponCodes.join(', ')}</span>
              ),
            },
            { id: 's', header: 'Start', cell: (r: CouponCampaignRow) => r.startDate },
            { id: 'e', header: 'End', cell: (r: CouponCampaignRow) => r.endDate },
          ]}
          rows={sorted}
          rowKey={(r) => r.campaignId}
        />
      </ResourcePanel>

      <ResourcePanel title="Add campaign">
        <form className="max-w-lg space-y-3 p-3" onSubmit={onAdd}>
          <div>
            <label className={setLbl}>Campaign name</label>
            <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring sale" />
          </div>
          <div>
            <div className={setLbl}>Coupons included</div>
            <div className="flex flex-wrap gap-2 rounded-sm border border-slate-200 bg-slate-50 p-2">
              {coupons.map((c) => (
                <label key={c.couponId} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300"
                    checked={codes.includes(c.code)}
                    onChange={() => toggleCode(c.code)}
                  />
                  <span className="font-mono">{c.code}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={setLbl}>Start date</label>
              <input type="date" className={setInp} value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className={setLbl}>End date</label>
              <input type="date" className={setInp} value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <button type="submit" className={adminBtnPrimary}>
            Save campaign
          </button>
        </form>
      </ResourcePanel>

      <ResourcePanel title="Campaign weight (illustrative)">
        <div className="space-y-2 p-3">
          {sorted.slice(0, 6).map((c) => (
            <div key={c.campaignId} className="flex items-center gap-2 text-xs">
              <span className="w-40 shrink-0 truncate text-slate-700">{c.name}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${(c.couponCodes.length / maxTrend) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 tabular-nums text-slate-500">{c.couponCodes.length}</span>
            </div>
          ))}
        </div>
      </ResourcePanel>
    </div>
  );
}
