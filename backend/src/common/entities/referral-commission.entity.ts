import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'referral_commissions' })
@Index(['referrerUserId', 'createdAt'])
export class ReferralCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_user_id', type: 'uuid' })
  referrerUserId: string;

  @Column({ name: 'conversion_id', type: 'uuid' })
  conversionId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'PAID';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
