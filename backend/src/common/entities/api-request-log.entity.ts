import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'api_request_logs' })
@Index(['createdAt'])
@Index(['statusCode', 'createdAt'])
@Index(['tenantId', 'createdAt'])
export class ApiRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 12 })
  method: string;

  @Column({ type: 'varchar', length: 512 })
  endpoint: string;

  @Column({ name: 'status_code', type: 'integer' })
  statusCode: number;

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs: number;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'error_type', type: 'varchar', length: 128, nullable: true })
  errorType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
