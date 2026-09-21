import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_deployment_health_checks' })
@Index(['deploymentId', 'createdAt'])
export class ThemeDeploymentHealthCheck {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'deployment_id', type: 'uuid' }) deploymentId: string;
  @Column({ type: 'varchar', length: 32 }) status:
    | 'PASSED'
    | 'FAILED'
    | 'PENDING';
  @Column({ type: 'integer', nullable: true }) latencyMs: number | null;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) details: Record<
    string,
    unknown
  >;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
