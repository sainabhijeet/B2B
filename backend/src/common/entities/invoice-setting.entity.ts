import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'invoice_settings' })
@Index(['tenantId'], { unique: true })
export class InvoiceSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'invoice_prefix', type: 'varchar', length: 32, default: 'INV' })
  invoicePrefix: string;

  @Column({ name: 'invoice_start_number', type: 'int', default: 1 })
  invoiceStartNumber: number;

  @Column({ name: 'invoice_format', type: 'varchar', length: 64, default: 'PREFIX-SEQUENCE' })
  invoiceFormat: string;

  /** Zero-padding width for the numeric segment (e.g. 4 → `0001`). */
  @Column({ name: 'counter_padding', type: 'int', default: 4 })
  counterPadding: number;

  @Column({ name: 'tax_enabled', type: 'boolean', default: true })
  taxEnabled: boolean;

  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
