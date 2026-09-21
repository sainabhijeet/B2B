import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'build_metrics' })
@Index(['buildJobId'], { unique: true })
export class BuildMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'build_job_id', type: 'uuid' })
  buildJobId: string;

  @Column({ name: 'queue_wait_time_ms', type: 'int', default: 0 })
  queueWaitTimeMs: number;

  @Column({ name: 'build_duration_ms', type: 'int', default: 0 })
  buildDurationMs: number;

  @Column({ name: 'artifact_size_bytes', type: 'bigint', default: 0 })
  artifactSizeBytes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
