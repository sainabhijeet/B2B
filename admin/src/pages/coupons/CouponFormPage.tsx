import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useCoupons } from '@/components/coupons/CouponContext';
import type { CouponStatus, DiscountType } from '@/lib/couponModels';
import { apiGet } from '@/lib/apiClient';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type Mode = 'create' | 'edit';
type PlanOption = { id: string; name: string };
type PlanApiRow = { id: string; name?: string; planName?: string };

export function CouponFormPage({ mode }: { mode: Mode }) {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const { coupons, addCoupon, updateCoupon } = useCoupons();

  const existing = mode === 'edit' ? coupons.find((c) => c.couponId === couponId) : undefined;

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState(20);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [usageLimit, setUsageLimit] = useState<number | ''>(100);
  const [unlimited, setUnlimited] = useState(false);
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [status, setStatus] = useState<CouponStatus>('active');
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    let alive = true;
    apiGet<{ data?: PlanApiRow[] } | PlanApiRow[]>('/subscriptions/plans')
      .then((body) => {
        const rows = Array.isArray(body) ? body : body.data ?? [];
        if (alive) {
          setPlans(rows.map((row) => ({ id: row.id, name: row.name ?? row.planName ?? row.id })));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setCode(existing.code);
      setDiscountType(existing.discountType);
      setValue(existing.value);
      setPlanIds(existing.planIds.length ? [...existing.planIds] : []);
      setUnlimited(existing.usageLimit == null);
      setUsageLimit(existing.usageLimit ?? '');
      setExpiryDate(existing.expiryDate.slice(0, 10));
      setStatus(existing.status === 'expired' ? 'active' : existing.status);
    }
    if (mode === 'create') {
      setCode('');
      setDiscountType('percentage');
      setValue(20);
      setPlanIds([]);
      setUnlimited(false);
      setUsageLimit(100);
      setExpiryDate('2026-12-31');
      setStatus('active');
    }
  }, [mode, existing, couponId]);

  if (mode === 'edit' && !existing) {
    return (
      <ResourcePanel title="Edit coupon">
        <p className="p-3 text-xs text-slate-600">Coupon not found.</p>
        <Link to="/subscriptions/coupons/list" className={`${adminBtnSecondary} m-3 inline-block`}>
          Back to list
        </Link>
      </ResourcePanel>
    );
  }

  function togglePlan(id: string) {
    setPlanIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const lim = unlimited ? null : Number(usageLimit) || 0;
    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      value: Number(value),
      planIds,
      usageLimit: lim,
      expiryDate: expiryDate.slice(0, 10),
      status,
    };
    if (mode === 'create') {
      addCoupon(payload);
      window.alert('Coupon created.');
    } else if (existing) {
      updateCoupon(existing.couponId, payload);
      window.alert('Coupon updated.');
    }
    navigate('/subscriptions/coupons/list');
  }

  return (
    <ResourcePanel title={mode === 'create' ? 'Create coupon' : `Edit — ${existing?.code ?? ''}`}>
      <form className="max-w-lg space-y-4 p-3" onSubmit={onSubmit}>
        <div>
          <label className={setLbl}>Coupon code</label>
          <input
            className={setInp}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="START20"
            required
          />
        </div>
        <div>
          <label className={setLbl}>Discount type</label>
          <select
            className={setInp}
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>{discountType === 'percentage' ? 'Percent off' : 'Amount (₹)'}</label>
          <input
            type="number"
            min={0}
            max={discountType === 'percentage' ? 100 : undefined}
            step={discountType === 'percentage' ? 1 : 1}
            className={setInp}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <div className={setLbl}>Applicable plans</div>
          <p className="mb-2 text-[10px] text-slate-500">Leave none checked for all plans.</p>
          <div className="space-y-1.5 rounded-sm border border-slate-200 bg-slate-50 p-2">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-slate-800">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={planIds.includes(p.id)}
                  onChange={() => togglePlan(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={setLbl}>Usage limit</label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              className={setInp + ' max-w-[8rem]'}
              value={unlimited ? '' : usageLimit}
              onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={unlimited}
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300"
                checked={unlimited}
                onChange={(e) => {
                  setUnlimited(e.target.checked);
                  if (e.target.checked) setUsageLimit('');
                }}
              />
              Unlimited
            </label>
          </div>
        </div>
        <div>
          <label className={setLbl}>Expiry date</label>
          <input
            type="date"
            className={setInp}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={setLbl}>Status</label>
          <select
            className={setInp}
            value={status}
            onChange={(e) => setStatus(e.target.value as CouponStatus)}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary}>
            {mode === 'create' ? 'Create coupon' : 'Save changes'}
          </button>
          <Link to="/subscriptions/coupons/list" className={adminBtnSecondary}>
            Cancel
          </Link>
        </div>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Persists to <span className="font-mono">admin_coupons</span> in production. Subscription checkout only — not
        product cart.
      </p>
    </ResourcePanel>
  );
}
