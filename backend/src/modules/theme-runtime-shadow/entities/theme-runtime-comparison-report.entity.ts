import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_runtime_comparison_reports' })
@Index(['tenantId', 'channel', 'createdAt'])
@Index(['requestId'], { unique: true })
export class ThemeRuntimeComparisonReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 160 })
  requestId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 16 })
  channel: 'WEB' | 'MOBILE';

  @Column({ name: 'legacy_response_hash', type: 'char', length: 64 })
  legacyResponseHash: string;

  @Column({
    name: 'canonical_response_hash',
    type: 'char',
    length: 64,
    nullable: true,
  })
  canonicalResponseHash: string | null;

  @Column({ name: 'legacy_duration_ms', type: 'integer', nullable: true })
  legacyDurationMs: number | null;

  @Column({ name: 'canonical_duration_ms', type: 'integer', nullable: true })
  canonicalDurationMs: number | null;

  @Column({ type: 'varchar', length: 32 })
  status: 'MATCH' | 'DIFFERENT' | 'UNAVAILABLE' | 'ERROR';

  @Column({ name: 'report_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  report: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
