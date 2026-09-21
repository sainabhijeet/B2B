import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_translation_audit_events' })
@Index(['jobId', 'createdAt'])
export class ThemeTranslationAuditEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'job_id', type: 'uuid' }) jobId: string;
  @Column({ name: 'entry_id', type: 'uuid', nullable: true }) entryId:
    | string
    | null;
  @Column({ type: 'varchar', length: 48 }) action: string;
  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId:
    | string
    | null;
  @Column({ name: 'payload_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  payloadJson: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
