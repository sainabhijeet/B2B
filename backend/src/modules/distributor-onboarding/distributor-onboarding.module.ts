import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../common/entities/tenant.entity';
import { Theme } from '../../common/entities/theme.entity';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantDomain } from '../../common/entities/tenant-domain.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantTheme } from '../../common/entities/tenant-theme.entity';
import { TenantThemeSettings } from '../../common/entities/tenant-theme-settings.entity';
import { TenantAppSettings } from '../../common/entities/tenant-app-settings.entity';
import { ThemeComboMapping } from '../../common/entities/theme-combo-mapping.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { DistributorOnboardingController } from './distributor-onboarding.controller';
import { DistributorOnboardingService } from './distributor-onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantOnboarding,
      TenantProfile,
      TenantBranding,
      TenantDomain,
      TenantDistributorApp,
      Tenant,
      Theme,
      TenantTheme,
      TenantThemeSettings,
      TenantAppSettings,
      ThemeComboMapping,
    ]),
  ],
  controllers: [DistributorOnboardingController],
  providers: [DistributorOnboardingService],
  exports: [DistributorOnboardingService],
})
export class DistributorOnboardingModule {}
