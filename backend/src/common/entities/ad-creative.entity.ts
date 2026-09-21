import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity({ name: 'ad_creatives' })
export class AdCreative {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => AdCampaign, (c) => c.creatives, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AdCampaign;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'target_url', type: 'text' })
  targetUrl: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  cta: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
