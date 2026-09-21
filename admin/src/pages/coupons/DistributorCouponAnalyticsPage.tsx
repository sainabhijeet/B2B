import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useCoupons } from '@/components/coupons/CouponContext';
import type { DistributorCouponSummary } from '@/lib/couponModels';

export function DistributorCouponAnalyticsPage() {
  const { distributorSummaries } = useCoupons();

  return (
    <ResourcePanel title="Distributor coupon analytics (read-only)">
      <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
        Aggregated view of distributor-issued <strong>order</strong> coupons. Creation happens in the distributor
        panel; this screen is for platform oversight only.
      </p>
      <DataTable
        columns={[
          { id: 'd', header: 'Distributor', cell: (r: DistributorCouponSummary) => r.distributorName },
          {
            id: 'a',
            header: 'Active coupons',
            cell: (r: DistributorCouponSummary) => r.activeCoupons.toLocaleString(),
          },
          {
            id: 'r',
            header: 'Redemptions (30d)',
            cell: (r: DistributorCouponSummary) => r.redemptions30d.toLocaleString(),
          },
          {
            id: '$',
            header: 'Discount given (30d)',
            cell: (r: DistributorCouponSummary) => `₹${r.discountGiven30d.toLocaleString('en-IN')}`,
          },
        ]}
        rows={distributorSummaries}
        rowKey={(r) => r.distributorId}
      />
    </ResourcePanel>
  );
}
