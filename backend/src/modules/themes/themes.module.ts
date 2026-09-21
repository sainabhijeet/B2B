import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Industry } from '../../common/entities/industry.entity';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { TenantSection } from '../../common/entities/tenant-section.entity';
import { TenantThemeSettings } from '../../common/entities/tenant-theme-settings.entity';
import { TenantThemeToken } from '../../common/entities/tenant-theme-token.entity';
import { TenantTheme } from '../../common/entities/tenant-theme.entity';
import { TenantThemeChange } from '../../common/entities/tenant-theme-change.entity';
import { ThemeComboMapping } from '../../common/entities/theme-combo-mapping.entity';
import { ThemePreviewImage } from '../../common/entities/theme-preview-image.entity';
import { Theme } from '../../common/entities/theme.entity';
import { DistributorThemesController } from './distributor-themes.controller';
import { ThemesController } from './themes.controller';
import { ThemeManifestCacheService } from './theme-manifest-cache.service';
import { ThemesService } from './themes.service';
import { WebsiteBuilderController } from './website-builder.controller';
import { ThemeArtifactsModule } from '../theme-artifacts/theme-artifacts.module';
import { ThemeRuntimeShadowModule } from '../theme-runtime-shadow/theme-runtime-shadow.module';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [
    ThemeArtifactsModule,
    ThemeRuntimeShadowModule,
    AppConfigModule,
    TypeOrmModule.forFeature([
      Theme,
      ThemePreviewImage,
      ThemeComboMapping,
      TenantTheme,
      TenantThemeChange,
      TenantThemeSettings,
      TenantSection,
      TenantThemeToken,
      TenantBranding,
      TenantOnboarding,
      TenantProfile,
      Industry,
      SystemConfig,
    ]),
  ],
  controllers: [
    ThemesController,
    WebsiteBuilderController,
    DistributorThemesController,
  ],
  providers: [ThemesService, ThemeManifestCacheService],
  exports: [ThemesService],
})
export class ThemesModule {}
