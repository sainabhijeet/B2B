import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export type TranslationEntryStatus =
  | 'MISSING'
  | 'DRAFT'
  | 'APPROVED'
  | 'REJECTED';

@Entity({ name: 'theme_translation_entries' })
@Index(['jobId', 'languageCode', 'translationKey'], { unique: true })
@Index(['themeId', 'languageCode', 'status'])
export class ThemeTranslationEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'job_id', type: 'uuid' }) jobId: string;
  @Column({ name: 'theme_id', type: 'uuid' }) themeId: string;
  @Column({ name: 'language_code', type: 'varchar', length: 16 })
  languageCode: string;
  @Column({ name: 'translation_key', type: 'varchar', length: 512 })
  translationKey: string;
  @Column({ name: 'source_text', type: 'text' }) sourceText: string;
  @Column({ name: 'draft_text', type: 'text', nullable: true }) draftText:
    | string
    | null;
  @Column({ name: 'approved_text', type: 'text', nullable: true })
  approvedText: string | null;
  @Column({ type: 'varchar', length: 24, default: 'MISSING' })
  status: TranslationEntryStatus;
  @Column({
    name: 'draft_provider',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  draftProvider: string | null;
  @Column({ name: 'draft_version', type: 'integer', default: 0 })
  draftVersion: number;
  @VersionColumn({ name: 'lock_version', default: 1 }) lockVersion: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
