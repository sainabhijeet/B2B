import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'failed_jobs' })
export class FailedJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_name', type: 'varchar', length: 64 })
  workerName: string;

  @Column({ name: 'queue_name', type: 'varchar', length: 64 })
  queueName: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: string;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payloadJson: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
