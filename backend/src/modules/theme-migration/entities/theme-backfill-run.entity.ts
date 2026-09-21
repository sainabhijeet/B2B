import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ThemeBackfillRunStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DRY_RUN';

@Entity({ name: 'theme_backfill_runs' })
@Index(['runKey'], { unique: true })
@Index(['startedAt'])
export class ThemeBackfillRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_key', type: 'varchar', length: 128 })
  runKey: string;

  @Column({ type: 'varchar', length: 32 })
  status: ThemeBackfillRunStatus;

  @Column({ name: 'dry_run', type: 'boolean', default: false })
  dryRun: boolean;

  @Column({ name: 'source_snapshot_at', type: 'timestamptz', nullable: true })
  sourceSnapshotAt: Date | null;

  @Column({
    name: 'counters_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  countersJson: Record<string, number>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
