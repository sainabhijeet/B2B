import { useEffect, useState } from 'react';
import { RecordView } from '@/components/ui/RecordView';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { ApiError } from '@/lib/apiClient';
import {
  fetchTenantUsage,
  type TenantUsageFromApi,
} from '@/lib/tenantsApi';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 2)} ${units[power]}`;
}

function usageWithLimit(value: number, limit?: number): string {
  if (limit == null || limit <= 0) return value.toLocaleString('en-IN');
  return `${value.toLocaleString('en-IN')} / ${limit.toLocaleString('en-IN')}`;
}

function UsageMetrics({ tenantId }: { tenantId: string }) {
  const [usage, setUsage] = useState<TenantUsageFromApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUsage(null);
    setError(null);
    void fetchTenantUsage(tenantId)
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof ApiError
            ? reason.message
            : 'Failed to load tenant usage.',
        );
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  if (error) {
    return <p className="px-1 text-sm text-red-600">{error}</p>;
  }
  if (!usage) {
    return <p className="px-1 text-sm text-slate-500">Loading usage…</p>;
  }

  return (
    <RecordView
      sections={[
        {
          title: 'Current totals',
          fields: [
            {
              label: 'Products',
              value: usageWithLimit(
                usage.products,
                usage.limits?.maxProducts,
              ),
            },
            {
              label: 'Users',
              value: usageWithLimit(usage.users, usage.limits?.maxUsers),
            },
            {
              label: 'Customers',
              value: usage.customers.toLocaleString('en-IN'),
            },
            {
              label: 'Orders',
              value: usage.orders.toLocaleString('en-IN'),
            },
            {
              label: 'Build artifact storage',
              value: formatBytes(usage.storageBytes),
            },
          ],
        },
        {
          title: 'Last 30 days',
          fields: [
            {
              label: 'API calls',
              value: usage.apiCalls30d.toLocaleString('en-IN'),
            },
            {
              label: 'Notifications',
              value: usage.notifications30d.toLocaleString('en-IN'),
            },
            {
              label: 'Notifications today',
              value: usageWithLimit(
                usage.notificationsToday,
                usage.limits?.notificationsPerDay,
              ),
            },
          ],
        },
      ]}
    />
  );
}

export function TenantUsageTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <div className="space-y-4">
          <ResourcePanel title="Tenant">
            <p className="px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800">{detail.name}</span>
              <span className="mx-1 text-slate-400">·</span>
              <code className="text-[10px]">{detail.id}</code>
            </p>
          </ResourcePanel>
          <UsageMetrics tenantId={detail.id} />
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
