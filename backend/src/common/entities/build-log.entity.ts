import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'build_logs' })
@Index(['buildJobId'])
export class BuildLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'build_job_id', type: 'uuid' })
  buildJobId: string;

  @Column({ name: 'log_level', type: 'varchar', length: 16, default: 'INFO' })
  logLevel: 'INFO' | 'WARN' | 'ERROR';

  @Column({ name: 'log_output', type: 'text' })
  logOutput: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
