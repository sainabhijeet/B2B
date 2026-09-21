import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdCreative } from './ad-creative.entity';
import { AdStat } from './ad-stat.entity';

/** Admin-only flag; tenant delivery still gated by `plan_limits.ads_enabled` (free vs paid). */
export type AdCampaignPlanTarget = 'FREE_ONLY' | 'ALL_PLANS';

@Entity({ name: 'ad_campaigns' })
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 128 })
  placement: string;

  @Column({ name: 'ad_type', type: 'varchar', length: 32, default: 'BANNER_AD' })
  adType: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  /** ACTIVE | PAUSED | SCHEDULED | ENDED */
  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  country: string | null;

  /** ALL | MOBILE | TABLET | DESKTOP */
  @Column({ name: 'device_type', type: 'varchar', length: 32, nullable: true })
  deviceType: string | null;

  @Column({ name: 'plan_target', type: 'varchar', length: 32, default: 'FREE_ONLY' })
  planTarget: AdCampaignPlanTarget;

  @OneToMany(() => AdCreative, (c) => c.campaign)
  creatives: AdCreative[];

  @OneToMany(() => AdStat, (s) => s.campaign)
  stats: AdStat[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
