import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
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

@ApiTags('Storefront app')
@Controller('storefront')
export class StorefrontAppConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly themesService: ThemesService,
    private readonly translationsService: TranslationsService,
    @InjectRepository(TenantProfile)
    private readonly tenantProfiles: Repository<TenantProfile>,
    @InjectRepository(TenantOnboarding)
    private readonly tenantOnboarding: Repository<TenantOnboarding>,
  ) {}

  /** Mobile / web storefront: app config (resolved tenant from middleware). */
  @Get('app-config')
  async getAppConfig(@Req() req: Request & { tenantId?: string | null }) {
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
    const data = await this.appConfigService.getForTenant(tenantId);
    return { success: true, data, meta: {}, message: '' };
  }

  /** Mobile storefront: slim `{ base_layout, config, branding }` from tenant mobile theme + branding. */
  @Get('theme')
  @SkipThrottle()
  async getStorefrontTheme(
    @Req() req: Request & { tenantId?: string | null },
    @Query('language') language?: string,
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
    return this.themesService.storefrontMobileTheme(tenantId, language);
  }

  /** Mobile checkout: distributor bank/UPI details. */
  @Get('payment-settings')
  async getPaymentSettings(@Req() req: Request & { tenantId?: string | null }) {
    const tenantId = req.tenantId ?? null;
    if (!tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    const [profile, onboarding] = await Promise.all([
      this.tenantProfiles.findOne({ where: { tenantId } }),
      this.tenantOnboarding.findOne({ where: { tenantId } }),
    ]);
    const p = (onboarding?.payloadJson ?? {}) as Record<string, unknown>;
    const text = (value: unknown): string => String(value ?? '').trim();
    const upiId = text(p['upiId']).replace(/\s+/g, '').toLowerCase();
    return {
      success: true,
      data: {
        accountHolderName: text(p['accountHolderName']) || profile?.businessName || '',
        bankName: text(p['bankName']),
        accountNumber: text(p['accountNumber']),
        ifsc: text(p['ifsc']),
        branch: text(p['branch']),
        upiId,
      },
      meta: {},
      message: '',
    };
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
