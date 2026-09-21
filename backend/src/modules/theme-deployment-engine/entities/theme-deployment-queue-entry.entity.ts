import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_deployment_queue_entries' })
@Index(['deploymentId'], { unique: true })
@Index(['priority', 'createdAt'])
export class ThemeDeploymentQueueEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'deployment_id', type: 'uuid' }) deploymentId: string;
  @Column({ type: 'integer', default: 100 }) priority: number;
  @Column({ type: 'varchar', length: 32, default: 'QUEUED' }) status: 'QUEUED';
  @Column({ name: 'queue_key', type: 'varchar', length: 160, unique: true })
  queueKey: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
