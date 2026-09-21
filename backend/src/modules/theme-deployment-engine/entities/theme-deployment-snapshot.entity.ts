import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'theme_deployment_snapshots' })
@Index(['deploymentId'], { unique: true })
export class ThemeDeploymentSnapshot {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'deployment_id', type: 'uuid' })
  deploymentId: string;

  @Column({ name: 'release_candidate_id', type: 'uuid' })
  releaseCandidateId: string;

  @Column({ name: 'release_version', type: 'varchar', length: 32 })
  releaseVersion: string;

  @Column({ name: 'package_sha256', type: 'char', length: 64 })
  packageSha256: string;

  @Column({
    name: 'manifest_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  manifest: Record<string, unknown>;

  @Column({
    name: 'snapshot_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  snapshot: Record<string, unknown>;

  @Column({ name: 'snapshot_hash', type: 'char', length: 64 })
  snapshotHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
