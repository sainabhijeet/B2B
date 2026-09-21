import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderSource } from '../enums/order-source.enum';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'orders' })
@Index(['tenantId', 'orderNumber'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_number', type: 'varchar', length: 64 })
  orderNumber: string;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: string;

  @Column({
    name: 'tax_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  taxAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount: string;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId: string | null;

  @Column({ name: 'coupon_code', type: 'varchar', length: 40, nullable: true })
  couponCode: string | null;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 32,
    default: 'PENDING',
  })
  paymentStatus: string;

  /** Snapshot of `public.customer_addresses.id` at checkout (no FK across schemas). */
  @Column({ name: 'shipping_address_id', type: 'uuid', nullable: true })
  shippingAddressId: string | null;

  /** Customer-selected payment mode, including manual modes and Razorpay checkout. */
  @Column({
    name: 'payment_mode',
    type: 'varchar',
    length: 32,
    default: 'CREDIT',
  })
  paymentMode: string;

  /** Channel: storefront checkout, WhatsApp quick order, or staff-entered manual order. */
  @Column({
    name: 'order_source',
    type: 'varchar',
    length: 32,
    default: OrderSource.STOREFRONT,
  })
  orderSource: OrderSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
