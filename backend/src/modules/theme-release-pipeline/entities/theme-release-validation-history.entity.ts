import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_release_validation_history' })
@Index(['candidateId', 'runKey'], { unique: true })
@Index(['candidateId', 'createdAt'])
export class ThemeReleaseValidationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ name: 'run_key', type: 'varchar', length: 128 })
  runKey: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status: string;

  @Column({ name: 'report_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  reportJson: Record<string, unknown>;

  @Column({ name: 'package_sha256', type: 'char', length: 64, nullable: true })
  packageSha256: string | null;

  @Column({ name: 'compatibility_score', type: 'smallint', nullable: true })
  compatibilityScore: number | null;

  @Column({ name: 'security_score', type: 'smallint', nullable: true })
  securityScore: number | null;

  @Column({ name: 'performance_score', type: 'smallint', nullable: true })
  performanceScore: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
