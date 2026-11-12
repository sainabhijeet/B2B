import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { AppConfigService } from '../app-config/app-config.service';
import { ThemesService } from '../themes/themes.service';
import { TranslationsService } from '../translations/translations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { DistributorPanelService } from '../distributor-panel/distributor-panel.service';
import {
  StorefrontProductsService,
  THEME_LIVE_PREVIEW_NOTICE,
} from './storefront-products.service';

function isPreviewRequest(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

@ApiTags('Storefront app')
@Controller('storefront')
export class StorefrontAppConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly themesService: ThemesService,
    private readonly translationsService: TranslationsService,
    private readonly distributorPanel: DistributorPanelService,
    private readonly storefrontProducts: StorefrontProductsService,
    @InjectRepository(TenantProfile)
    private readonly tenantProfiles: Repository<TenantProfile>,
    @InjectRepository(TenantOnboarding)
    private readonly tenantOnboarding: Repository<TenantOnboarding>,
  ) {}

  /** Mobile / web storefront: app config (resolved tenant from middleware). */
  @Get('app-config')
  async getAppConfig(
    @Req() req: Request & { tenantId?: string | null },
    @Query('preview') preview?: string,
  ) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      const xs = req.headers['x-storefront-host'];
      const hostHint =
        typeof xs === 'string' && xs.trim().length > 0
          ? ` No ACTIVE tenant matched for X-Storefront-Host=${xs.trim()} (subdomain must equal tenants.slug, e.g. run backend: npm run tenants:seed).`
          : '';
      throw new BadRequestException(
        `Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.${hostHint}`,
      );
    }
    const [data, catalogPresentation] = await Promise.all([
      this.appConfigService.getForTenant(tenantId),
      this.storefrontProducts.catalogPresentation(tenantId),
    ]);
    const effectiveCatalogPresentation = isPreviewRequest(preview)
      ? {
          ...catalogPresentation,
          mode: 'DEMO' as const,
          notice: THEME_LIVE_PREVIEW_NOTICE,
        }
      : catalogPresentation;
    return {
      success: true,
      data: { ...data, catalogPresentation: effectiveCatalogPresentation },
      meta: {},
      message: '',
    };
  }

  /** Mobile storefront: slim `{ base_layout, config, branding }` from tenant mobile theme + branding. */
  @Get('theme')
  @SkipThrottle()
  async getStorefrontTheme(
    @Req() req: Request & { tenantId?: string | null },
    @Query('language') language?: string,
    @Query('preview') preview?: string,
  ) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      const xs = req.headers['x-storefront-host'];
      const hostHint =
        typeof xs === 'string' && xs.trim().length > 0
          ? ` No ACTIVE tenant matched for X-Storefront-Host=${xs.trim()} (subdomain must equal tenants.slug, e.g. run backend: npm run tenants:seed).`
          : '';
      throw new BadRequestException(
        `Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.${hostHint}`,
      );
    }
    const catalogPresentation =
      await this.storefrontProducts.catalogPresentation(tenantId);
    const explicitPreview = isPreviewRequest(preview);
    const effectiveCatalogPresentation = explicitPreview
      ? {
          ...catalogPresentation,
          mode: 'DEMO' as const,
          notice: THEME_LIVE_PREVIEW_NOTICE,
        }
      : catalogPresentation;
    const theme = await this.themesService.storefrontMobileTheme(
      tenantId,
      language,
      explicitPreview || catalogPresentation.mode === 'DEMO',
    );
    return {
      ...theme,
      data: {
        ...theme.data,
        catalog_mode: effectiveCatalogPresentation.mode,
        catalog_notice: effectiveCatalogPresentation.notice,
      },
    };
  }

  /** Mobile checkout: distributor bank/UPI details. */
  @Get('payment-settings')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async getPaymentSettings(@Req() req: Request & { tenantId?: string | null }) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    return this.distributorPanel.getPaymentSettings(tenantId);
  }

  /** Web storefront: runtime dictionary for code-defined route text. */
  @Post('translations/runtime')
  @SkipThrottle()
  async runtimeTranslations(
    @Req() req: Request & { tenantId?: string | null },
    @Body() body: { texts?: unknown[]; content?: unknown },
  ) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      const xs = req.headers['x-storefront-host'];
      const hostHint =
        typeof xs === 'string' && xs.trim().length > 0
          ? ` No ACTIVE tenant matched for X-Storefront-Host=${xs.trim()} (subdomain must equal tenants.slug).`
          : '';
      throw new BadRequestException(
        `Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.${hostHint}`,
      );
    }
    const appConfig = await this.appConfigService.getForTenant(tenantId);
    const sources = [
      ...(Array.isArray(body?.texts) ? body.texts : []),
      body?.content,
    ];
    const dictionary = await this.translationsService.translateRuntimeDictionary(
      tenantId,
      appConfig.selectedLanguageCode,
      sources,
    );
    return {
      success: true,
      data: {
        selectedLanguageCode: appConfig.selectedLanguageCode,
        dictionary,
      },
      meta: {},
      message: '',
    };
  }
}
