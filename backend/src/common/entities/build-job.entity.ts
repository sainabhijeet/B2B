import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'build_jobs' })
@Index(['tenantId'])
@Index(['status'])
@Index(['buildType'])
export class BuildJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'build_type', type: 'varchar', length: 32 })
  buildType: 'ANDROID_APK' | 'ANDROID_AAB' | 'IOS_IPA' | 'WEB';

  @Column({ name: 'package_name', type: 'varchar', length: 255 })
  packageName: string;

  @Column({ name: 'app_name', type: 'varchar', length: 255 })
  appName: string;

  @Column({ name: 'theme_id', type: 'varchar', length: 128, nullable: true })
  themeId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  languages: string[];

  @Column({ name: 'firebase_app_id', type: 'varchar', length: 255, nullable: true })
  firebaseAppId: string | null;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS';

  @Column({ type: 'int', default: 1 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;
}
