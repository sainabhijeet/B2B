import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { DeploymentState } from './theme-enterprise-deployment.entity';

@Entity({ name: 'theme_deployment_events' })
@Index(['deploymentId', 'sequence'], { unique: true })
@Index(['deploymentId', 'idempotencyKey'], { unique: true })
export class ThemeDeploymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deployment_id', type: 'uuid' })
  deploymentId: string;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  idempotencyKey: string;

  @Column({ name: 'from_state', type: 'varchar', length: 16, nullable: true })
  fromState: DeploymentState | null;

  @Column({ name: 'to_state', type: 'varchar', length: 16 })
  toState: DeploymentState;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
