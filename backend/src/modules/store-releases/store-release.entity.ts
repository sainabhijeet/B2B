import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StoreReleasePlatform = 'ANDROID' | 'IOS';
export type StoreReleaseProvider = 'GOOGLE_PLAY' | 'APPLE_APP_STORE';
export type StoreReleaseStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'LIVE'
  | 'FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

@Entity({ name: 'store_releases' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'platform', 'createdAt'])
@Index(['buildArtifactId'])
export class StoreRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'build_artifact_id', type: 'uuid' })
  buildArtifactId: string;

  @Column({ name: 'app_version_id', type: 'uuid', nullable: true })
  appVersionId: string | null;

  @Column({ type: 'varchar', length: 16 })
  platform: StoreReleasePlatform;

  @Column({ name: 'store_provider', type: 'varchar', length: 32 })
  storeProvider: StoreReleaseProvider;

  @Column({ type: 'varchar', length: 64, nullable: true })
  track: string | null;

  @Column({ name: 'version_name', type: 'varchar', length: 64, nullable: true })
  versionName: string | null;

  @Column({ name: 'version_code', type: 'int', nullable: true })
  versionCode: number | null;

  @Column({ type: 'varchar', length: 32, default: 'DRAFT' })
  status: StoreReleaseStatus;

  @Column({
    name: 'external_release_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalReleaseId: string | null;

  @Column({
    name: 'last_error_code',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  lastErrorCode: string | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
