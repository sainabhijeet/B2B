import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdCampaign } from '../../common/entities/ad-campaign.entity';
import { AdCreative } from '../../common/entities/ad-creative.entity';
import { AdStat } from '../../common/entities/ad-stat.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdCampaign, AdCreative, AdStat]), SubscriptionsModule],
  controllers: [AdsController],
  providers: [AdsService],
})
export class AdsModule {}
