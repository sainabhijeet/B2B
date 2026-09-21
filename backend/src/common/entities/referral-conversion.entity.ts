import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'referral_conversions' })
@Index(['referrerUserId', 'createdAt'])
export class ReferralConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_user_id', type: 'uuid' })
  referrerUserId: string;

  @Column({ name: 'referred_tenant_id', type: 'uuid' })
  referredTenantId: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @Column({ type: 'varchar', length: 24, default: 'REGISTERED' })
  status: 'REGISTERED' | 'SUBSCRIBED' | 'COMMISSION_PAID';

  @Column({ name: 'client_ip', type: 'varchar', length: 45, nullable: true })
  clientIp: string | null;

  @Column({ name: 'fraud_flag', type: 'boolean', default: false })
  fraudFlag: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
