import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { fetchActivityLogs } from '@/lib/adminConsoleApi';
import type { ActivityLogRow } from '@/lib/logsMonitoringModels';

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function RbacStaffActivityPage() {
  const [rows, setRows] = useState<ActivityLogRow[]>([]);

  useEffect(() => {
    let alive = true;
    fetchActivityLogs()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ResourcePanel title="Admin staff activity">
      <DataTable
        columns={[
          { id: 'user', header: 'User', cell: (r: ActivityLogRow) => r.user },
          { id: 'email', header: 'Email', cell: (r: ActivityLogRow) => r.user },
          { id: 'action', header: 'Action', cell: (r: ActivityLogRow) => r.action },
          { id: 'module', header: 'Module', cell: (r: ActivityLogRow) => r.module },
          { id: 'ts', header: 'Time', cell: (r: ActivityLogRow) => fmt(r.timestamp) },
        ]}
        rows={rows}
        rowKey={(r: ActivityLogRow) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Tracks actions performed by staff accounts from the audit log stream.
      </p>
    </ResourcePanel>
  );
}
