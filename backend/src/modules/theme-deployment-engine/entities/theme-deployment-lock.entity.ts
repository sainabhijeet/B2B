import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_deployment_locks' })
@Index(['tenantId', 'channel', 'environment'], { unique: true })
export class ThemeDeploymentLock {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ type: 'varchar', length: 16 }) channel: string;
  @Column({ type: 'varchar', length: 32 }) environment: string;
  @Column({ name: 'deployment_id', type: 'uuid' }) deploymentId: string;
  @Column({ name: 'lease_token', type: 'varchar', length: 128, unique: true })
  leaseToken: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
