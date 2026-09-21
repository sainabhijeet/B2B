import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type DeploymentChannel = 'WEB' | 'MOBILE' | 'COMBINED';
export type DeploymentEnvironment = 'PREVIEW' | 'STAGING' | 'PRODUCTION';
export type DeploymentState =
  | 'QUEUED'
  | 'PREPARING'
  | 'DEPLOYING'
  | 'VERIFYING'
  | 'HEALTHY'
  | 'FAILED'
  | 'ROLLEDBACK'
  | 'CANCELLED';

@Entity({ name: 'theme_enterprise_deployments' })
@Index(['tenantId', 'channel', 'environment', 'createdAt'])
@Index(['releaseCandidateId', 'createdAt'])
export class ThemeEnterpriseDeployment {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 160,
    unique: true,
  })
  idempotencyKey: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 16 })
  channel: DeploymentChannel;

  @Column({ type: 'varchar', length: 32 })
  environment: DeploymentEnvironment;

  @Column({ name: 'release_candidate_id', type: 'uuid' })
  releaseCandidateId: string;

  @Column({ name: 'snapshot_id', type: 'uuid', unique: true })
  snapshotId: string;

  @Column({
    name: 'initial_state',
    type: 'varchar',
    length: 16,
    default: 'QUEUED',
  })
  initialState: 'QUEUED';

  @Column({
    name: 'version_graph_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  versionGraph: Record<string, unknown>;

  @Column({
    name: 'dependency_report_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  dependencyReport: Record<string, unknown>;

  @Column({
    name: 'canary_metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  canaryMetadata: Record<string, unknown>;

  @Column({
    name: 'rollout_metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  rolloutMetadata: Record<string, unknown>;

  @Column({
    name: 'rollback_metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  rollbackMetadata: Record<string, unknown>;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
