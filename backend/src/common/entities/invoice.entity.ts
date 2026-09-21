import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'invoices' })
@Index(['tenantId', 'invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'invoice_number', type: 'varchar', length: 64 })
  invoiceNumber: string;

  @Column({ name: 'invoice_prefix', type: 'varchar', length: 32 })
  invoicePrefix: string;

  @Column({ name: 'invoice_format', type: 'varchar', length: 64, default: 'PREFIX-SEQUENCE' })
  invoiceFormat: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ name: 'gst_number', type: 'varchar', length: 32, nullable: true })
  gstNumber: string | null;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount: string;

  @Column({ type: 'varchar', length: 32, default: 'GENERATED' })
  status: string;

  @Column({ name: 'document_reference', type: 'text', nullable: true })
  documentReference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
