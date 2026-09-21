import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'build_artifacts' })
@Index(['buildJobId'])
export class BuildArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'build_job_id', type: 'uuid' })
  buildJobId: string;

  @Column({ name: 'artifact_type', type: 'varchar', length: 32 })
  artifactType: 'APK' | 'AAB' | 'IPA' | 'WEB_BUNDLE';

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: string;

  @Column({ name: 'version_code', type: 'int', nullable: true })
  versionCode: number | null;

  @Column({ name: 'version_name', type: 'varchar', length: 64, nullable: true })
  versionName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
