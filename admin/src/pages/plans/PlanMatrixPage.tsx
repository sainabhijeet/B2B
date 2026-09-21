import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { PLAN_FEATURE_MATRIX } from '@/lib/planDemoData';

export function PlanMatrixPage() {
  return (
    <div>
      <PageHeader
        title="Plan feature matrix"
        description="Quick comparison: Free vs Basic vs Premium (demo snapshot)."
        actions={
          <Link to="/subscriptions/plans" className={adminBtnSecondary}>
            ← Plans list
          </Link>
        }
      />
      <ResourcePanel>
        <DataTable
          columns={[
            { id: 'f', header: 'Feature', cell: (r) => r.feature },
            { id: 'free', header: 'Free', cell: (r) => r.free },
            { id: 'basic', header: 'Basic', cell: (r) => r.basic },
            { id: 'premium', header: 'Premium', cell: (r) => r.premium },
          ]}
          rows={PLAN_FEATURE_MATRIX}
          rowKey={(r) => r.feature}
        />
      </ResourcePanel>
    </div>
  );
}
