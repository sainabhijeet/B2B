import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'coupon_redemptions' })
@Index(['tenantId', 'orderId'], { unique: true })
@Index(['couponId', 'customerId'])
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2 })
  discountAmount: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
