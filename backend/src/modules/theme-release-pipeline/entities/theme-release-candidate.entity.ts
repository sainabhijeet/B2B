import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  VersionColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ThemeReleaseCandidateChannel = 'WEB' | 'MOBILE';
export type ThemeReleaseCandidateStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'QUARANTINED'
  | 'VALIDATING'
  | 'REJECTED'
  | 'VALIDATED'
  | 'APPROVAL_READY'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'DEPRECATED'
  | 'ARCHIVED';

@Entity({ name: 'theme_release_candidates' })
@Index(['idempotencyKey'], { unique: true })
@Index(['familySlug', 'channel', 'version'], { unique: true })
@Index(['status', 'createdAt'])
export class ThemeReleaseCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'family_slug', type: 'varchar', length: 128 })
  familySlug: string;

  @Column({ type: 'varchar', length: 16 })
  channel: ThemeReleaseCandidateChannel;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'varchar', length: 32, default: 'QUARANTINED' })
  status: ThemeReleaseCandidateStatus;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string | null;

  @Column({
    name: 'changelog_json',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  changelog: Array<Record<string, unknown>>;

  @Column({
    name: 'rollback_metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  rollbackMetadata: Record<string, unknown>;

  @VersionColumn({ name: 'lifecycle_revision', type: 'integer', default: 1 })
  lifecycleRevision: number;

  @Column({ name: 'quarantine_key', type: 'varchar', length: 512 })
  quarantineKey: string;

  @Column({ name: 'package_sha256', type: 'char', length: 64, nullable: true })
  packageSha256: string | null;

  @Column({ name: 'package_size_bytes', type: 'bigint', nullable: true })
  packageSizeBytes: string | null;

  @Column({
    name: 'manifest_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  manifestVersion: string | null;

  @Column({
    name: 'manifest_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  manifestJson: Record<string, unknown>;

  @Column({
    name: 'release_metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  releaseMetadataJson: Record<string, unknown>;

  @Column({
    name: 'validation_report_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  validationReportJson: Record<string, unknown>;

  @Column({ name: 'compatibility_score', type: 'smallint', nullable: true })
  compatibilityScore: number | null;

  @Column({ name: 'security_score', type: 'smallint', nullable: true })
  securityScore: number | null;

  @Column({ name: 'performance_score', type: 'smallint', nullable: true })
  performanceScore: number | null;

  @Column({
    name: 'preview_manifest_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  previewManifestJson: Record<string, unknown>;

  @Column({ name: 'preview_key', type: 'varchar', length: 512, nullable: true })
  previewKey: string | null;

  @Column({ name: 'validation_run_count', type: 'integer', default: 0 })
  validationRunCount: number;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
