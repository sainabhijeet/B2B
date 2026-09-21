import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_deployment_progress_events' })
@Index(['deploymentId', 'createdAt'])
export class ThemeDeploymentProgressEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'deployment_id', type: 'uuid' }) deploymentId: string;
  @Column({ type: 'smallint' }) percent: number;
  @Column({ type: 'varchar', length: 128, nullable: true }) message:
    | string
    | null;
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 160,
    unique: true,
  })
  idempotencyKey: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
