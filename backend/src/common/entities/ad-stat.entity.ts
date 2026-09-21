import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity({ name: 'ad_stats' })
@Unique('UQ_ad_stats_campaign_date', ['campaignId', 'date'])
export class AdStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => AdCampaign, (c) => c.stats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AdCampaign;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;
}
