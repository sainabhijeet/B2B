import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type TranslationRevisionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'theme_translation_revisions' })
@Index(['entryId', 'version'], { unique: true })
export class ThemeTranslationRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'entry_id', type: 'uuid' }) entryId: string;
  @Column({ type: 'integer' }) version: number;
  @Column({ name: 'translation_text', type: 'text' }) translationText: string;
  @Column({ type: 'varchar', length: 24 }) status: TranslationRevisionStatus;
  @Column({ name: 'provider', type: 'varchar', length: 64, nullable: true })
  provider: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy:
    | string
    | null;
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true }) reviewedBy:
    | string
    | null;
  @Column({ name: 'review_note', type: 'text', nullable: true }) reviewNote:
    | string
    | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
