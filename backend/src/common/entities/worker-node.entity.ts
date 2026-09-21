import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'worker_nodes' })
@Index(['hostname'], { unique: true })
export class WorkerNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  hostname: string;

  @Column({ type: 'varchar', length: 16, default: 'ONLINE' })
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';

  @Column({ name: 'active_jobs', type: 'int', default: 0 })
  activeJobs: number;

  @Column({ name: 'last_heartbeat', type: 'timestamptz' })
  lastHeartbeat: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
