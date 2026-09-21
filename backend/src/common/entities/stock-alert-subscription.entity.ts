import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StockAlertStatus = 'ACTIVE' | 'NOTIFIED' | 'CANCELLED';

@Entity({ name: 'stock_alert_subscriptions' })
@Index(['tenantId', 'userId', 'status'])
@Index(['tenantId', 'productId', 'variantId', 'status'])
export class StockAlertSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({
    name: 'variant_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  variantName: string | null;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: StockAlertStatus;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
