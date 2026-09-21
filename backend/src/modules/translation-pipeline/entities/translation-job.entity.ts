import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TranslationJobStatus =
  | 'QUEUED'
  | 'AUDITING'
  | 'DRAFTING'
  | 'REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

@Entity({ name: 'theme_translation_jobs' })
@Index(['themeId', 'sourceLanguage', 'status'])
export class ThemeTranslationJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true }) tenantId:
    | string
    | null;
  @Column({ name: 'theme_id', type: 'uuid' }) themeId: string;
  @Column({
    name: 'theme_version',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  themeVersion: string | null;
  @Column({
    name: 'source_language',
    type: 'varchar',
    length: 16,
    default: 'en',
  })
  sourceLanguage: string;
  @Column({ name: 'target_languages', type: 'jsonb' })
  targetLanguages: string[];
  @Column({ type: 'varchar', length: 24, default: 'QUEUED' })
  status: TranslationJobStatus;
  @Column({ name: 'requested_by', type: 'uuid', nullable: true }) requestedBy:
    | string
    | null;
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;
  @Column({ name: 'entry_count', type: 'integer', default: 0 })
  entryCount: number;
  @Column({ name: 'approved_count', type: 'integer', default: 0 })
  approvedCount: number;
  @Column({
    name: 'metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadataJson: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
