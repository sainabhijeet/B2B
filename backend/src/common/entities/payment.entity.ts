import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** SaaS subscription charges: tenant → platform (`/billing`). For storefront customer orders use `order_payments` (manual/UPI). */
@Entity({ name: 'payments' })
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'transactionReference'], {
  unique: true,
  where: '"transaction_reference" IS NOT NULL',
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 32 })
  paymentMethod: 'UPI' | 'BANK_TRANSFER' | 'RAZORPAY';

  @Column({ name: 'payment_status', type: 'varchar', length: 16, default: 'PENDING' })
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Column({ name: 'transaction_reference', type: 'varchar', length: 255, nullable: true })
  transactionReference: string | null;

  @Column({ name: 'razorpay_order_id', type: 'varchar', length: 64, nullable: true })
  razorpayOrderId: string | null;

  @Column({ name: 'razorpay_payment_id', type: 'varchar', length: 64, nullable: true })
  razorpayPaymentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
