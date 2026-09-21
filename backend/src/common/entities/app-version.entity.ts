import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'app_versions' })
@Index(['tenantId'])
@Index(['buildJobId'])
@Index(['status'])
@Index(['tenantId', 'platform', 'buildNumber'], { unique: true })
export class AppVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'build_job_id', type: 'uuid' })
  buildJobId: string;

  @Column({ name: 'artifact_id', type: 'uuid', nullable: true })
  artifactId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'ANDROID' })
  platform: 'ANDROID' | 'IOS';

  @Column({ name: 'build_number', type: 'int' })
  buildNumber: number;

  @Column({ name: 'version_code', type: 'int' })
  versionCode: number;

  @Column({ name: 'version_name', type: 'varchar', length: 64 })
  versionName: string;

  @Column({ name: 'build_status', type: 'varchar', length: 32, default: 'RESERVED' })
  buildStatus: 'RESERVED' | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string | null;

  @Column({ type: 'varchar', length: 32, default: 'DRAFT' })
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ROLLED_BACK';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
