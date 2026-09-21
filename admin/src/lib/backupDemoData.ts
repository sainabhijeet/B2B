/** Demo — maps to backups, restore_logs. */

export type BackupType = 'full' | 'database' | 'files' | 'config';

export type BackupStatus = 'completed' | 'running' | 'failed' | 'queued';

export type BackupRow = {
  backupId: string;
  type: BackupType;
  sizeBytes: number;
  status: BackupStatus;
  createdAt: string;
  filePath: string;
  includes: string;
};

export type RestoreLogRow = {
  restoreId: string;
  backupId: string;
  status: 'completed' | 'failed' | 'pending';
  restoredAt: string;
  note: string;
};

export type BackupSettings = {
  frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  scheduleTime: string;
  retentionDays: number;
  storageLocation: 's3' | 'r2' | 'remote' | 'local';
  compression: boolean;
  encryptionEnabled: boolean;
};

export const TYPE_LABELS: Record<BackupType, string> = {
  full: 'Full',
  database: 'Database',
  files: 'Files',
  config: 'Config',
};

export const STORAGE_LABELS: Record<BackupSettings['storageLocation'], string> = {
  s3: 'AWS S3',
  r2: 'Cloudflare R2',
  remote: 'Remote server',
  local: 'Local storage',
};

export const INITIAL_BACKUPS: BackupRow[] = [
  {
    backupId: 'BKP-1204',
    type: 'full',
    sizeBytes: 3_654_502_604,
    status: 'completed',
    createdAt: '2026-04-12T02:00:00+05:30',
    filePath: 's3://platform-backups/full/BKP-1204.tar.enc',
    includes: 'Database, media, configs',
  },
  {
    backupId: 'BKP-1203',
    type: 'database',
    sizeBytes: 892_000_000,
    status: 'completed',
    createdAt: '2026-04-11T02:00:00+05:30',
    filePath: 's3://platform-backups/db/BKP-1203.sql.gz',
    includes: 'PostgreSQL dump',
  },
  {
    backupId: 'BKP-0410-manual',
    type: 'files',
    sizeBytes: 1_200_000_000,
    status: 'completed',
    createdAt: '2026-04-10T14:30:00+05:30',
    filePath: 'r2://backups/media/BKP-0410-manual.tgz',
    includes: 'Media + object storage mirror',
  },
];

export const INITIAL_RESTORE_LOGS: RestoreLogRow[] = [
  {
    restoreId: 'rsv-1',
    backupId: 'BKP-1190',
    status: 'completed',
    restoredAt: '2026-01-08T11:00:00+05:30',
    note: 'Staging refresh from weekly full',
  },
];

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  frequency: 'daily',
  scheduleTime: '02:00',
  retentionDays: 14,
  storageLocation: 'r2',
  compression: true,
  encryptionEnabled: true,
};

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
