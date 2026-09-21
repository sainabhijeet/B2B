import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../../common/entities/customer.entity';
import { TempCustomer } from '../../../common/entities/temp-customer.entity';
import { Tenant } from '../../../common/entities/tenant.entity';

@Entity({ name: 'whatsapp_order_sessions' })
@Index(['tenantId', 'lastActiveAt'])
export class WhatsappOrderSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'temp_customer_id', type: 'uuid', nullable: true })
  tempCustomerId: string | null;

  @ManyToOne(() => TempCustomer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'temp_customer_id' })
  tempCustomer: TempCustomer | null;

  @Column({ type: 'varchar', length: 32, default: 'IDLE' })
  state: string;

  @Column({ name: 'context_json', type: 'jsonb', default: () => `'{}'` })
  contextJson: Record<string, unknown>;

  @Column({ name: 'last_active_at', type: 'timestamptz' })
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
