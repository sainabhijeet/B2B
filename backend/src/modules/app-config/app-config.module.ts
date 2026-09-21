import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { TenantAppSettings } from '../../common/entities/tenant-app-settings.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { LocalizationModule } from '../../common/localization/localization.module';
import { DistributorOnboardingModule } from '../distributor-onboarding/distributor-onboarding.module';
import { AppConfigService } from './app-config.service';
import { DistributorAppConfigController } from './distributor-app-config.controller';

@Module({
  imports: [
    LocalizationModule,
    DistributorOnboardingModule,
    TypeOrmModule.forFeature([
      TenantAppSettings,
      TenantDistributorApp,
      TenantProfile,
      Industry,
    ]),
  ],
  controllers: [DistributorAppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService, TypeOrmModule],
})
export class AppConfigModule {}
