import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformWhatsappNumber } from '../../common/entities/platform-whatsapp-number.entity';
import { AppVersion } from '../../common/entities/app-version.entity';
import { TenantDomain } from '../../common/entities/tenant-domain.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { TenantPaymentSettings } from '../../common/entities/tenant-payment-settings.entity';
import { TenantThemeSettings } from '../../common/entities/tenant-theme-settings.entity';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { WhatsappMessage } from '../../common/entities';
import { BuildModule } from '../../build-system/build.module';
import { SecurityModule } from '../../common/security/security.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { DistributorPanelController } from './distributor-panel.controller';
import { DistributorPanelService } from './distributor-panel.service';

@Module({
  imports: [
    AppConfigModule,
    BuildModule,
    SecurityModule,
    TypeOrmModule.forFeature([
      TenantDomain,
      TenantDistributorApp,
      WhatsappMessage,
      PlatformWhatsappNumber,
      AppVersion,
      BuildJob,
      BuildArtifact,
      TenantThemeSettings,
      TenantOnboarding,
      TenantProfile,
      TenantPaymentSettings,
    ]),
  ],
  controllers: [DistributorPanelController],
  providers: [DistributorPanelService],
  exports: [DistributorPanelService],
})
export class DistributorPanelModule {}
