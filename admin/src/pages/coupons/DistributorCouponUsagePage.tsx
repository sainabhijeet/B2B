import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useCoupons } from '@/components/coupons/CouponContext';
import type { DistributorCouponUsageRow } from '@/lib/couponModels';

export function DistributorCouponUsagePage() {
  const { distributorUsage } = useCoupons();

  return (
    <ResourcePanel title="Distributor coupon usage (read-only)">
      <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
        Recent redemptions against distributor product-order coupons. Not subscription checkout.
      </p>
      <DataTable
        columns={[
          { id: 'dist', header: 'Distributor', cell: (r: DistributorCouponUsageRow) => r.distributorName },
          {
            id: 'code',
            header: 'Code',
            cell: (r: DistributorCouponUsageRow) => <span className="font-mono text-[10px]">{r.couponCode}</span>,
          },
          {
            id: 'ord',
            header: 'Order',
            cell: (r: DistributorCouponUsageRow) => <span className="font-mono text-[10px]">{r.orderId}</span>,
          },
          {
            id: '$',
            header: 'Discount',
            cell: (r: DistributorCouponUsageRow) => `₹${r.discountAmount.toLocaleString('en-IN')}`,
          },
          {
            id: 'at',
            header: 'Used at',
            cell: (r: DistributorCouponUsageRow) => new Date(r.usedAt).toLocaleString(),
          },
        ]}
        rows={distributorUsage}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
