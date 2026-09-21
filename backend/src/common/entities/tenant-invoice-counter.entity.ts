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

@Entity({ name: 'tenant_invoice_counters' })
@Index(['tenantId', 'financialYear'], { unique: true })
export class TenantInvoiceCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** e.g. `2025-26` (India April–March FY). */
  @Column({ name: 'financial_year', type: 'varchar', length: 16 })
  financialYear: string;

  /** Next sequence to assign; after issuing invoice `n`, this becomes `n + 1`. */
  @Column({ name: 'next_number', type: 'int' })
  nextNumber: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
