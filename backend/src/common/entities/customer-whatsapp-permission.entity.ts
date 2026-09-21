import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'customer_whatsapp_permissions' })
export class CustomerWhatsappPermission {
  @PrimaryColumn({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @OneToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'can_view_status', type: 'boolean', default: false })
  canViewStatus: boolean;

  @Column({ name: 'can_view_invoice', type: 'boolean', default: false })
  canViewInvoice: boolean;

  /** New orders / browse SKUs / smart reorder (options 2–4 in quick-order menu). */
  @Column({ name: 'can_place_order', type: 'boolean', default: false })
  canPlaceOrder: boolean;

  /** “Repeat last order” and repeat-order flows. */
  @Column({ name: 'can_repeat_order', type: 'boolean', default: false })
  canRepeatOrder: boolean;

  @Column({ name: 'can_view_credit', type: 'boolean', default: false })
  canViewCredit: boolean;

  @Column({ name: 'can_receive_broadcast', type: 'boolean', default: false })
  canReceiveBroadcast: boolean;
}
