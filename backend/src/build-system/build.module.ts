import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from '../common/entities/app-version.entity';
import { BuildArtifact } from '../common/entities/build-artifact.entity';
import { BuildJob } from '../common/entities/build-job.entity';
import { TenantBranding } from '../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../common/entities/tenant-app.entity';
import { TenantThemeSettings } from '../common/entities/tenant-theme-settings.entity';
import { Theme } from '../common/entities/theme.entity';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';
import { BuildController } from './build.controller';
import { BuildService } from './build.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BuildJob,
      BuildArtifact,
      AppVersion,
      TenantBranding,
      TenantDistributorApp,
      TenantThemeSettings,
      Theme,
    ]),
    SubscriptionsModule,
  ],
  controllers: [BuildController],
  providers: [BuildService],
  exports: [BuildService],
})
export class BuildModule {}
