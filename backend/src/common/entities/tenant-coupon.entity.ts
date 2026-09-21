import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

@Entity({ name: 'tenant_coupons' })
@Index(['tenantId', 'code'], { unique: true })
@Index(['tenantId', 'active', 'endsAt'])
export class TenantCoupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 16 })
  discountType: CouponDiscountType;

  @Column({ name: 'discount_value', type: 'numeric', precision: 12, scale: 2 })
  discountValue: string;

  @Column({ name: 'minimum_order_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  minimumOrderAmount: string;

  @Column({ name: 'maximum_discount_amount', type: 'numeric', precision: 12, scale: 2, nullable: true })
  maximumDiscountAmount: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'per_customer_limit', type: 'int', default: 1 })
  perCustomerLimit: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
