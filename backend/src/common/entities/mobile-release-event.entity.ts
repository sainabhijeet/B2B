import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'mobile_release_events' })
@Index(['releaseId', 'createdAt'])
export class MobileReleaseEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'release_id', type: 'uuid' })
  releaseId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 64 })
  event: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
