import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'referral_settings' })
export class ReferralSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'commission_percent', type: 'numeric', precision: 5, scale: 2, default: 10 })
  commissionPercent: string;

  @Column({ name: 'minimum_payout', type: 'numeric', precision: 12, scale: 2, default: 1000 })
  minimumPayout: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
