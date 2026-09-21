import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'order_requests' })
@Index(['tenantId', 'orderId', 'createdAt'])
@Index('idx_order_requests_active_unique', ['tenantId', 'orderId'], {
  unique: true,
  where: `"status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REPLACEMENT_SHIPPED')`,
})
export class OrderRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'distributor_id', type: 'uuid' })
  distributorId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'varchar', length: 16 })
  type: 'REPLACEMENT' | 'CANCEL';

  @Column({ name: 'reason_code', type: 'varchar', length: 40 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Private document references. API responses replace these with signed URLs. */
  @Column({ name: 'photo_urls', type: 'jsonb', default: () => "'[]'::jsonb" })
  photoUrls: string[];

  @Column({ type: 'varchar', length: 32, default: 'REQUESTED' })
  status:
    | 'REQUESTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'REPLACEMENT_SHIPPED'
    | 'COMPLETED';

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
