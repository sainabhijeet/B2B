import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MobileReleasePlatform = 'GOOGLE_PLAY' | 'APP_STORE';
export type MobileReleaseStatus =
  | 'BUILD_PENDING'
  | 'BUILDING'
  | 'BUILD_SUCCESSFUL'
  | 'BUILD_FAILED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'FAILED';

@Entity({ name: 'mobile_releases' })
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'platform', 'status'])
export class MobileRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'build_job_id', type: 'uuid', nullable: true })
  buildJobId: string | null;

  @Column({ name: 'artifact_id', type: 'uuid' })
  artifactId: string;

  @Column({ type: 'varchar', length: 24 })
  platform: MobileReleasePlatform;

  @Column({ name: 'version_name', type: 'varchar', length: 64 })
  versionName: string;

  @Column({ name: 'build_number', type: 'int' })
  buildNumber: number;

  @Column({ name: 'package_name', type: 'varchar', length: 255 })
  packageName: string;

  @Column({ name: 'release_track', type: 'varchar', length: 32, nullable: true })
  releaseTrack: string | null;

  @Column({ name: 'google_release_id', type: 'varchar', length: 255, nullable: true })
  googleReleaseId: string | null;

  @Column({ name: 'apple_build_id', type: 'varchar', length: 255, nullable: true })
  appleBuildId: string | null;

  @Column({ name: 'build_date', type: 'timestamptz', nullable: true })
  buildDate: Date | null;

  @Column({ name: 'upload_date', type: 'timestamptz', nullable: true })
  uploadDate: Date | null;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid', nullable: true })
  uploadedByUserId: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: MobileReleaseStatus;

  @Column({ name: 'download_url', type: 'text', nullable: true })
  downloadUrl: string | null;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string | null;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'processing_status', type: 'varchar', length: 64, nullable: true })
  processingStatus: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'source_release_id', type: 'uuid', nullable: true })
  sourceReleaseId: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
