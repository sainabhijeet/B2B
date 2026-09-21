import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../../common/entities/plan.entity';
import { ReferralCode } from '../../common/entities/referral-code.entity';
import { ReferralCommission } from '../../common/entities/referral-commission.entity';
import { ReferralConversion } from '../../common/entities/referral-conversion.entity';
import { ReferralSetting } from '../../common/entities/referral-setting.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { User } from '../../common/entities/user.entity';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralCode,
      ReferralConversion,
      ReferralCommission,
      ReferralSetting,
      User,
      Subscription,
      Plan,
    ]),
  ],
  providers: [ReferralsService],
  controllers: [ReferralsController],
  exports: [ReferralsService],
})
export class ReferralsModule {}
