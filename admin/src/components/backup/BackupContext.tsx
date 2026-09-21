import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  DEFAULT_BACKUP_SETTINGS,
  INITIAL_BACKUPS,
  INITIAL_RESTORE_LOGS,
  type BackupRow,
  type BackupSettings,
  type BackupType,
  type RestoreLogRow,
} from '@/lib/backupDemoData';

type BackupValue = {
  backups: BackupRow[];
  setBackups: Dispatch<SetStateAction<BackupRow[]>>;
  restoreLogs: RestoreLogRow[];
  setRestoreLogs: Dispatch<SetStateAction<RestoreLogRow[]>>;
  settings: BackupSettings;
  setSettings: Dispatch<SetStateAction<BackupSettings>>;
  dashboard: {
    lastBackupAt: string | null;
    totalBackups: number;
    storageUsedBytes: number;
    nextScheduledLabel: string;
  };
  createManualBackup: (input: {
    type: BackupType;
    includeDatabase: boolean;
    includeMedia: boolean;
    includeConfigs: boolean;
  }) => void;
  deleteBackup: (backupId: string) => void;
  recordRestore: (backupId: string, success: boolean, note?: string) => void;
};

const BackupContext = createContext<BackupValue | null>(null);

export function BackupProvider({ children }: { children: ReactNode }) {
  const [backups, setBackups] = useState<BackupRow[]>(() => INITIAL_BACKUPS.map((b) => ({ ...b })));
  const [restoreLogs, setRestoreLogs] = useState<RestoreLogRow[]>(() =>
    INITIAL_RESTORE_LOGS.map((r) => ({ ...r })),
  );
  const [settings, setSettings] = useState<BackupSettings>(() => ({ ...DEFAULT_BACKUP_SETTINGS }));

  const dashboard = useMemo(() => {
    const completed = backups.filter((b) => b.status === 'completed');
    const sorted = [...completed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = sorted[0] ?? null;
    const storageUsedBytes = backups.reduce((s, b) => s + b.sizeBytes, 0);
    const freq = settings.frequency;
    const nextLabel =
      freq === 'manual'
        ? 'Manual only — no auto run'
        : `${freq.charAt(0).toUpperCase() + freq.slice(1)} · next ~ ${settings.scheduleTime} (demo)`;
    return {
      lastBackupAt: last?.createdAt ?? null,
      totalBackups: backups.length,
      storageUsedBytes,
      nextScheduledLabel: nextLabel,
    };
  }, [backups, settings]);

  const createManualBackup = useCallback(
    (input: {
      type: BackupType;
      includeDatabase: boolean;
      includeMedia: boolean;
      includeConfigs: boolean;
    }) => {
      const id = `BKP-${Date.now().toString().slice(-6)}`;
      const parts: string[] = [];
      if (input.includeDatabase) parts.push('Database');
      if (input.includeMedia) parts.push('Media');
      if (input.includeConfigs) parts.push('Configs');
      const includes = parts.length ? parts.join(', ') : '—';
      const baseSize =
      input.type === 'full' ? 3.2e9 : input.type === 'database' ? 9e8 : input.type === 'files' ? 1.1e9 : 5e6;
      const row: BackupRow = {
        backupId: id,
        type: input.type,
        sizeBytes: Math.floor(baseSize * (0.9 + Math.random() * 0.2)),
        status: 'completed',
        createdAt: new Date().toISOString(),
        filePath: `${settings.storageLocation === 'r2' ? 'r2' : 's3'}://platform-backups/${input.type}/${id}.enc`,
        includes,
      };
      setBackups((list) => [row, ...list]);
    },
    [settings.storageLocation],
  );

  const deleteBackup = useCallback((backupId: string) => {
    setBackups((list) => list.filter((b) => b.backupId !== backupId));
  }, []);

  const recordRestore = useCallback((backupId: string, success: boolean, note = '') => {
    const row: RestoreLogRow = {
      restoreId: `rsv-${Date.now()}`,
      backupId,
      status: success ? 'completed' : 'failed',
      restoredAt: new Date().toISOString(),
      note: note || (success ? 'Restore completed (demo)' : 'Restore aborted'),
    };
    setRestoreLogs((list) => [row, ...list]);
  }, []);

  const value = useMemo(
    () => ({
      backups,
      setBackups,
      restoreLogs,
      setRestoreLogs,
      settings,
      setSettings,
      dashboard,
      createManualBackup,
      deleteBackup,
      recordRestore,
    }),
    [backups, restoreLogs, settings, dashboard, createManualBackup, deleteBackup, recordRestore],
  );

  return <BackupContext.Provider value={value}>{children}</BackupContext.Provider>;
}

export function useBackup(): BackupValue {
  const c = useContext(BackupContext);
  if (!c) throw new Error('useBackup must be used inside BackupProvider');
  return c;
}
