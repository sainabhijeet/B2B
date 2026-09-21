import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { Tenant } from './tenant.entity';

/** Distributor analytics: which main-menu actions shoppers tap (Meta interactive ids). */
@Entity({ name: 'whatsapp_menu_clicks' })
@Index(['tenantId', 'createdAt'])
export class WhatsappMenuClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  /** `ORDER`, `REPEAT`, `MORE`, etc. */
  @Column({ name: 'menu_key', type: 'varchar', length: 32 })
  menuKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
