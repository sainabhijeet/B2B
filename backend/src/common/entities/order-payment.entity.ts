import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

/** Tenant storefront: customer -> tenant payment proof flow. SaaS billing still uses `payments` + `/billing`. */
@Entity({ name: 'order_payments' })
@Index(['orderId'], { unique: true })
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['tenantId', 'utrNumber'], {
  unique: true,
  where: '"utr_number" IS NOT NULL',
})
@Index(['razorpayOrderId'], {
  unique: true,
  where: '"razorpay_order_id" IS NOT NULL',
})
@Index(['razorpayPaymentId'], {
  unique: true,
  where: '"razorpay_payment_id" IS NOT NULL',
})
export class OrderPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  paymentReference: string | null;

  @Column({ name: 'payment_screenshot_url', type: 'text', nullable: true })
  paymentScreenshotUrl: string | null;

  @Column({ name: 'payment_note', type: 'text', nullable: true })
  paymentNote: string | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 32,
    default: 'UPI_QR',
  })
  paymentMethod: string;

  @Column({ name: 'utr_number', type: 'varchar', length: 128, nullable: true })
  utrNumber: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  amount: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedByUser: User | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({
    name: 'razorpay_order_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  razorpayOrderId: string | null;

  @Column({
    name: 'razorpay_payment_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  razorpayPaymentId: string | null;

  @Column({
    name: 'razorpay_refund_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  razorpayRefundId: string | null;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
