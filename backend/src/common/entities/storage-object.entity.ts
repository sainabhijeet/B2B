import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaFolder } from './media-folder.entity';
import { PlatformStorageProvider } from './platform-storage-provider.entity';
import { Tenant } from './tenant.entity';

export type StorageObjectOwnershipType = 'PLATFORM' | 'TENANT';
export type StorageObjectStatus = 'QUARANTINED' | 'ACTIVE' | 'DELETED';
export type StorageObjectScanStatus =
  | 'NOT_REQUIRED'
  | 'QUARANTINED'
  | 'SCANNING'
  | 'CLEAN'
  | 'INFECTED'
  | 'SCAN_FAILED';
export type StorageObjectAccessScope =
  | 'PLATFORM_PRIVATE'
  | 'TENANT_PRIVATE'
  | 'PUBLIC_METADATA';

@Entity({ name: 'storage_objects' })
@Check(
  'CHK_storage_objects_owner_scope',
  `(("ownership_type" = 'PLATFORM' AND "tenant_id" IS NULL) OR ("ownership_type" = 'TENANT' AND "tenant_id" IS NOT NULL))`,
)
@Check(
  'CHK_storage_objects_ownership_type',
  `"ownership_type" IN ('PLATFORM', 'TENANT')`,
)
@Check(
  'CHK_storage_objects_status',
  `"status" IN ('QUARANTINED', 'ACTIVE', 'DELETED')`,
)
@Check(
  'CHK_storage_objects_scan_status',
  `"scan_status" IN ('NOT_REQUIRED', 'QUARANTINED', 'SCANNING', 'CLEAN', 'INFECTED', 'SCAN_FAILED')`,
)
@Check(
  'CHK_storage_objects_scan_policy',
  `(("scan_required" = false AND "scan_status" = 'NOT_REQUIRED') OR ("scan_required" = true AND "scan_status" <> 'NOT_REQUIRED'))`,
)
@Check(
  'CHK_storage_objects_quarantine_policy',
  `"status" <> 'QUARANTINED' OR "scan_required" = true`,
)
@Check(
  'CHK_storage_objects_active_scan_policy',
  `"status" <> 'ACTIVE' OR "scan_required" = false OR "scan_status" = 'CLEAN'`,
)
@Check('CHK_storage_objects_scan_attempts', `"scan_attempts" >= 0`)
@Check(
  'CHK_storage_objects_access_scope',
  `"access_scope" IN ('PLATFORM_PRIVATE', 'TENANT_PRIVATE', 'PUBLIC_METADATA')`,
)
@Check(
  'CHK_storage_objects_scope_matches_owner',
  `(("ownership_type" = 'PLATFORM' AND "access_scope" = 'PLATFORM_PRIVATE') OR ("ownership_type" = 'TENANT' AND "access_scope" IN ('TENANT_PRIVATE', 'PUBLIC_METADATA')))`,
)
@Check(
  'CHK_storage_objects_size_non_negative',
  `"size_bytes" IS NULL OR "size_bytes" >= 0`,
)
@Check(
  'CHK_storage_objects_checksum_sha256',
  `"checksum_sha256" IS NULL OR "checksum_sha256" ~ '^[a-f0-9]{64}$'`,
)
@Check(
  'CHK_storage_objects_key_safe',
  `"object_key" <> '' AND "object_key" !~ '(^|/)\\.\\.?(/|$)' AND "object_key" NOT LIKE '/%' AND "object_key" NOT LIKE '%\\%' AND "object_key" NOT LIKE '%:%'`,
)
@Index('IDX_storage_objects_tenant_status', ['tenantId', 'status'])
@Index('IDX_storage_objects_provider_status', ['providerId', 'status'])
@Index('IDX_storage_objects_folder_status', ['folderId', 'status'])
@Index('IDX_storage_objects_object_key', ['objectKey'])
@Index('IDX_storage_objects_owner_category_status', [
  'ownershipType',
  'objectCategory',
  'status',
])
@Index('IDX_storage_objects_created_at', ['createdAt'])
export class StorageObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @ManyToOne(() => PlatformStorageProvider, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: PlatformStorageProvider | null;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId: string | null;

  @ManyToOne(() => MediaFolder, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'folder_id' })
  folder: MediaFolder | null;

  @Column({ name: 'object_key', type: 'varchar', length: 1024 })
  objectKey: string;

  @Column({
    name: 'original_filename',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  originalFilename: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 255, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: string | null;

  @Column({ name: 'checksum_sha256', type: 'char', length: 64, nullable: true })
  checksumSha256: string | null;

  @Column({ name: 'ownership_type', type: 'varchar', length: 16 })
  ownershipType: StorageObjectOwnershipType;

  @Column({ name: 'object_category', type: 'varchar', length: 64 })
  objectCategory: string;

  @Column({
    name: 'access_scope',
    type: 'varchar',
    length: 32,
    default: 'TENANT_PRIVATE',
  })
  accessScope: StorageObjectAccessScope;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: StorageObjectStatus;

  @Column({ name: 'scan_required', type: 'boolean', default: false })
  scanRequired: boolean;

  @Column({
    name: 'scan_status',
    type: 'varchar',
    length: 24,
    default: 'NOT_REQUIRED',
  })
  scanStatus: StorageObjectScanStatus;

  @Column({
    name: 'scanner_provider',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  scannerProvider: string | null;

  @Column({
    name: 'scanner_verdict',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  scannerVerdict: string | null;

  @Column({ name: 'scan_started_at', type: 'timestamptz', nullable: true })
  scanStartedAt: Date | null;

  @Column({ name: 'scanned_at', type: 'timestamptz', nullable: true })
  scannedAt: Date | null;

  @Column({
    name: 'scanner_error_code',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  scannerErrorCode: string | null;

  @Column({ name: 'scan_attempts', type: 'integer', default: 0 })
  scanAttempts: number;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
