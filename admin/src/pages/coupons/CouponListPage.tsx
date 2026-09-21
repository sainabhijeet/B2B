import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useCoupons } from '@/components/coupons/CouponContext';
import {
  discountTypeLabel,
  formatDiscount,
  planLabel,
  type AdminCouponRow,
} from '@/lib/couponModels';

function fmtDate(iso: string) {
  try {
    return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function statusClass(s: AdminCouponRow['status']) {
  if (s === 'active') return 'text-emerald-700';
  if (s === 'disabled') return 'text-slate-600';
  return 'text-red-700';
}

export function CouponListPage() {
  const { coupons, deleteCoupon, toggleCouponDisabled, usageForCoupon } = useCoupons();
  const [usageForId, setUsageForId] = useState<string | null>(null);
  const rows = [...coupons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const usageRows = usageForId ? usageForCoupon(usageForId) : [];

  return (
    <>
      <ResourcePanel
        title="Platform coupons"
        toolbar={
          <Link to="/subscriptions/coupons/new" className={adminBtnPrimary}>
            Create coupon
          </Link>
        }
      >
        <DataTable
          columns={[
            {
              id: 'code',
              header: 'Coupon code',
              cell: (r: AdminCouponRow) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
            },
            {
              id: 'dtype',
              header: 'Discount type',
              cell: (r: AdminCouponRow) => discountTypeLabel(r.discountType),
            },
            {
              id: 'val',
              header: 'Value',
              cell: (r: AdminCouponRow) => formatDiscount(r.discountType, r.value),
            },
            {
              id: 'plan',
              header: 'Applicable plan',
              cell: (r: AdminCouponRow) => planLabel(r.planIds),
            },
            {
              id: 'limit',
              header: 'Usage limit',
              cell: (r: AdminCouponRow) =>
                r.usageLimit == null ? 'Unlimited' : `${r.usedCount} / ${r.usageLimit}`,
            },
            {
              id: 'exp',
              header: 'Expiry',
              cell: (r: AdminCouponRow) => fmtDate(r.expiryDate),
            },
            {
              id: 'st',
              header: 'Status',
              cell: (r: AdminCouponRow) => (
                <span className={`text-xs font-medium capitalize ${statusClass(r.status)}`}>{r.status}</span>
              ),
            },
            {
              id: 'act',
              header: 'Actions',
              className: 'min-w-[14rem]',
              cell: (r: AdminCouponRow) => (
                <div className="flex max-w-[16rem] flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/subscriptions/coupons/${r.couponId}/edit`} className={adminBtnSecondary}>
                    Edit
                  </Link>
                  <button type="button" className={adminBtnSecondary} onClick={() => setUsageForId(r.couponId)}>
                    View usage
                  </button>
                  <button type="button" className={adminBtnSecondary} onClick={() => toggleCouponDisabled(r.couponId)}>
                    {r.status === 'disabled' ? 'Enable' : 'Disable'}
                  </button>
                  <button
                    type="button"
                    className={adminBtnDanger}
                    onClick={() => {
                      if (window.confirm(`Delete coupon ${r.code}?`)) deleteCoupon(r.couponId);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.couponId}
        />
      </ResourcePanel>

      {usageForId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="usage-dialog-title"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-sm border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h2 id="usage-dialog-title" className="text-sm font-semibold text-slate-900">
                Usage — {coupons.find((c) => c.couponId === usageForId)?.code ?? usageForId}
              </h2>
              <button
                type="button"
                className={adminBtnSecondary}
                onClick={() => setUsageForId(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-2">
              {usageRows.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-slate-500">No coupon usage recorded.</p>
              ) : (
                <DataTable
                  columns={[
                    { id: 't', header: 'Tenant', cell: (u) => u.tenantName },
                    { id: 'p', header: 'Plan', cell: (u) => u.planId },
                    { id: 'd', header: 'Discount', cell: (u) => `₹${u.discountAmount.toLocaleString('en-IN')}` },
                    { id: 'at', header: 'Used at', cell: (u) => new Date(u.usedAt).toLocaleString() },
                  ]}
                  rows={usageRows}
                  rowKey={(u) => u.usageId}
                />
              )}
            </div>
            <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
              Maps to <span className="font-mono">admin_coupon_usage</span> (tenant_id, plan_id, discount_amount, used_at).
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
