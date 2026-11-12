import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlatformStorageProviderType = 'LOCAL' | 'S3_COMPATIBLE';
export type PlatformStorageProviderStatus = 'active' | 'inactive';
export type PlatformStorageProviderMode = 'TEST' | 'LIVE';
export type PlatformStorageProviderHealthStatus =
  | 'UNKNOWN'
  | 'HEALTHY'
  | 'UNHEALTHY';

export type LocalStorageProviderConfig = {
  publicBaseUrl: string | null;
};

export type S3CompatibleStorageProviderConfig = {
  endpoint: string;
  region: string;
  bucketName: string;
  publicBaseUrl: string | null;
};

export type PlatformStorageProviderConfig =
  | LocalStorageProviderConfig
  | S3CompatibleStorageProviderConfig;

export type S3CompatibleStorageProviderCredentials = {
  accessKeyId?: string;
  secretAccessKey?: string;
};

/**
 * Platform-level storage provider registry.
 *
 * Phase 1 is provider management only. Existing `/storage/*` runtime remains
 * filesystem-authoritative until a future explicitly approved migration phase.
 */
@Entity({ name: 'platform_storage_providers' })
@Index('IDX_platform_storage_providers_type_status', ['type', 'status'])
@Index('IDX_platform_storage_providers_default', ['isDefault'])
@Index('IDX_platform_storage_providers_health', ['healthStatus'])
@Index('IDX_platform_storage_providers_mode', ['mode'])
export class PlatformStorageProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: PlatformStorageProviderType;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: PlatformStorageProviderStatus;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 8, default: 'LIVE' })
  mode: PlatformStorageProviderMode;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  configuration: PlatformStorageProviderConfig;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  credentials: S3CompatibleStorageProviderCredentials;

  @Column({
    name: 'health_status',
    type: 'varchar',
    length: 16,
    default: 'UNKNOWN',
  })
  healthStatus: PlatformStorageProviderHealthStatus;

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;

  @Column({
    name: 'last_successful_check_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSuccessfulCheckAt: Date | null;

  @Column({ name: 'last_failed_check_at', type: 'timestamptz', nullable: true })
  lastFailedCheckAt: Date | null;

  @Column({ name: 'last_latency_ms', type: 'integer', nullable: true })
  lastLatencyMs: number | null;

  @Column({
    name: 'health_message',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  healthMessage: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
