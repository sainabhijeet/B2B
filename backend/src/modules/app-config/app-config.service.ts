import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Industry } from '../../common/entities/industry.entity';
import { TenantAppSettings } from '../../common/entities/tenant-app-settings.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import {
  DistributorOnboardingService,
  normalizePlatformLanguageCode,
} from '../distributor-onboarding/distributor-onboarding.service';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';
import { LocalizationService } from '../../common/localization/localization.service';
import type { EnterpriseLanguageCode } from '../../common/localization/localization.constants';

export type AppConfigLanguageContract = {
  tenantId: string | null;
  languageCode: EnterpriseLanguageCode;
  locale: string;
  direction: 'ltr' | 'rtl';
  revision: number;
  supportedLanguages: EnterpriseLanguageCode[];
  languageOptions: Array<{
    code: EnterpriseLanguageCode;
    name: string;
  }>;
  source: 'tenant_app_settings.selected_language_code';
};

export type AppConfigPublic = {
  allowGuestAccess: boolean;
  showPricesToGuest: boolean;
  allowGuestCart: boolean;
  enableRepeatOrder: boolean;
  enableCreditView: boolean;
  enableNotifications: boolean;
  defaultHomeLayout: 'grid' | 'list';
  showBanner: boolean;
  selectedLanguageCode: string;
  languageContract: AppConfigLanguageContract;
  industryId: string | null;
  industryName: string | null;
};

@Injectable()
export class AppConfigService {
  private readonly log = new Logger(AppConfigService.name);

  constructor(
    @InjectRepository(TenantAppSettings)
    private readonly repo: Repository<TenantAppSettings>,
    @InjectRepository(TenantDistributorApp)
    private readonly appRepo: Repository<TenantDistributorApp>,
    @InjectRepository(TenantProfile)
    private readonly profileRepo: Repository<TenantProfile>,
    @InjectRepository(Industry)
    private readonly industryRepo: Repository<Industry>,
    private readonly localization: LocalizationService,
    private readonly onboarding: DistributorOnboardingService,
  ) {}

  private static readonly defaults: AppConfigPublic = {
    allowGuestAccess: false,
    showPricesToGuest: false,
    allowGuestCart: false,
    enableRepeatOrder: true,
    enableCreditView: true,
    enableNotifications: true,
    defaultHomeLayout: 'grid',
    showBanner: true,
    selectedLanguageCode: 'en',
    languageContract: {
      tenantId: null,
      languageCode: 'en',
      locale: 'en-IN',
      direction: 'ltr',
      revision: 0,
      supportedLanguages: ['en', 'hi', 'zh', 'ar', 'fr', 'de', 'es', 'gu'],
      languageOptions: [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'es', name: 'Spanish' },
        { code: 'gu', name: 'Gujarati' },
      ],
      source: 'tenant_app_settings.selected_language_code',
    },
    industryId: null,
    industryName: null,
  };

  private isMissingSettingsTableError(e: unknown): boolean {
    if (!(e instanceof QueryFailedError)) return false;
    const msg = (e.message ?? '').toLowerCase();
    const code = (e as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code;
    if (!msg.includes('tenant_app_settings')) return false;
    return code === '42P01' || msg.includes('does not exist');
  }

  /** New columns not migrated yet (`42703` = undefined_column on Postgres). */
  private isMissingSettingsColumnError(e: unknown): boolean {
    if (!(e instanceof QueryFailedError)) return false;
    const code = (e as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code;
    if (code !== '42703') return false;
    const msg = (e.message ?? '').toLowerCase();
    return (
      msg.includes('tenant_app_settings') ||
      msg.includes('enable_repeat_order') ||
      msg.includes('enable_credit_view') ||
      msg.includes('default_home_layout') ||
      msg.includes('show_banner') ||
      msg.includes('selected_language_code')
    );
  }

  private normalizeLayout(v: string | null | undefined): 'grid' | 'list' {
    return v === 'list' ? 'list' : 'grid';
  }

  private fromRow(
    row: TenantAppSettings | null,
    industry?: { industryId: string | null; industryName: string | null },
    selectedLanguageCode = 'en',
    languageContract?: AppConfigLanguageContract,
  ): AppConfigPublic {
    const resolvedLanguage = this.localization.assertSupported(
      normalizePlatformLanguageCode(
        row?.selectedLanguageCode || selectedLanguageCode,
      ),
    );
    const contract =
      languageContract ?? this.staticLanguageContract(null, resolvedLanguage);
    if (!row) {
      return {
        ...AppConfigService.defaults,
        selectedLanguageCode: resolvedLanguage,
        languageContract: contract,
        ...(industry ?? {}),
      };
    }
    return {
      allowGuestAccess: row.allowGuestAccess ?? false,
      showPricesToGuest: row.showPricesToGuest ?? false,
      allowGuestCart: row.allowGuestCart ?? false,
      enableRepeatOrder: row.enableRepeatOrder ?? true,
      enableCreditView: row.enableCreditView ?? true,
      enableNotifications: row.enableNotifications ?? true,
      defaultHomeLayout: this.normalizeLayout(row.defaultHomeLayout),
      showBanner: row.showBanner ?? true,
      selectedLanguageCode: resolvedLanguage,
      languageContract: contract,
      industryId: industry?.industryId ?? null,
      industryName: industry?.industryName ?? null,
    };
  }

  public staticLanguageContract(
    tenantId: string | null,
    language: string | null | undefined,
    revision = 0,
  ): AppConfigLanguageContract {
    const languageCode = this.localization.resolveLanguage(language);
    return {
      tenantId,
      languageCode,
      locale: this.localization.localeForLanguage(languageCode),
      direction: this.localization.direction(languageCode),
      revision,
      supportedLanguages:
        AppConfigService.defaults.languageContract.supportedLanguages,
      languageOptions:
        AppConfigService.defaults.languageContract.languageOptions,
      source: 'tenant_app_settings.selected_language_code',
    };
  }

  private async languageContractForTenant(
    tenantId: string,
  ): Promise<AppConfigLanguageContract> {
    const [context, rows] = await Promise.all([
      this.localization.languageContext(tenantId),
      this.onboarding.listLanguages(),
    ]);
    const enterpriseLanguages = new Set(this.localization.supportedLanguages());
    const languageOptions = rows
      .filter(
        (language) =>
          language.status === 'active' &&
          enterpriseLanguages.has(language.code as EnterpriseLanguageCode),
      )
      .map((language) => ({
        code: language.code as EnterpriseLanguageCode,
        name: language.name,
      }));
    const resolvedOptions = languageOptions.length
      ? languageOptions
      : AppConfigService.defaults.languageContract.languageOptions;
    return {
      ...context,
      supportedLanguages: resolvedOptions.map((option) => option.code),
      languageOptions: resolvedOptions.map((option) => ({ ...option })),
      source: 'tenant_app_settings.selected_language_code',
    };
  }

  private async resolveTenantIndustry(
    tenantId: string,
  ): Promise<{ industryId: string | null; industryName: string | null }> {
    const profile = await this.profileRepo.findOne({
      where: { tenantId },
      select: ['industryId'],
    });
    const industryId = profile?.industryId ?? null;
    if (!industryId) return { industryId: null, industryName: null };
    const industry = await this.industryRepo.findOne({
      where: { industryId },
      select: ['industryId', 'name'],
    });
    return {
      industryId,
      industryName: industry?.name?.trim() || null,
    };
  }

  /** Storefront + distributor read. */
  async getForTenant(tenantId: string): Promise<AppConfigPublic> {
    try {
      const [row, industry, selectedLanguageCode] = await Promise.all([
        this.repo.findOne({ where: { tenantId } }),
        this.resolveTenantIndustry(tenantId),
        this.localization.currentLanguage(tenantId),
      ]);
      const languageContract = await this.languageContractForTenant(tenantId);
      const resolved = this.fromRow(
        row,
        industry,
        selectedLanguageCode,
        languageContract,
      );
      return resolved;
    } catch (e) {
      if (this.isMissingSettingsTableError(e)) {
        this.log.warn(
          `tenant_app_settings not available (${tenantId.slice(0, 8)}…); returning defaults. Run: npm run migration:run`,
        );
        return { ...AppConfigService.defaults };
      }
      if (this.isMissingSettingsColumnError(e)) {
        this.log.warn(
          `tenant_app_settings is missing app-config columns (${tenantId.slice(0, 8)}…); returning safe defaults. Run: npm run migration:run`,
        );
        return { ...AppConfigService.defaults };
      }
      throw e;
    }
  }

  async updateForTenant(
    tenantId: string,
    dto: UpdateAppConfigDto,
  ): Promise<AppConfigPublic> {
    const current = await this.getForTenant(tenantId);
    const next: AppConfigPublic = {
      allowGuestAccess: dto.allowGuestAccess ?? current.allowGuestAccess,
      showPricesToGuest: dto.showPricesToGuest ?? current.showPricesToGuest,
      allowGuestCart: dto.allowGuestCart ?? current.allowGuestCart,
      enableRepeatOrder: dto.enableRepeatOrder ?? current.enableRepeatOrder,
      enableCreditView: dto.enableCreditView ?? current.enableCreditView,
      enableNotifications:
        dto.enableNotifications ?? current.enableNotifications,
      defaultHomeLayout: dto.defaultHomeLayout ?? current.defaultHomeLayout,
      showBanner: dto.showBanner ?? current.showBanner,
      selectedLanguageCode:
        dto.selectedLanguageCode === undefined
          ? current.selectedLanguageCode
          : this.localization.assertSupported(
              normalizePlatformLanguageCode(dto.selectedLanguageCode),
            ),
      languageContract: current.languageContract,
      industryId: current.industryId,
      industryName: current.industryName,
    };

    if (!next.allowGuestAccess) {
      next.allowGuestCart = false;
      next.showPricesToGuest = false;
    }
    const languageChanged =
      next.selectedLanguageCode !== current.selectedLanguageCode;

    try {
      let row = await this.repo.findOne({ where: { tenantId } });
      if (!row) {
        row = this.repo.create({
          tenantId,
          allowGuestAccess: next.allowGuestAccess,
          showPricesToGuest: next.showPricesToGuest,
          allowGuestCart: next.allowGuestCart,
          enableRepeatOrder: next.enableRepeatOrder,
          enableCreditView: next.enableCreditView,
          enableNotifications: next.enableNotifications,
          defaultHomeLayout: next.defaultHomeLayout,
          showBanner: next.showBanner,
          selectedLanguageCode: next.selectedLanguageCode,
        });
      } else {
        row.allowGuestAccess = next.allowGuestAccess;
        row.showPricesToGuest = next.showPricesToGuest;
        row.allowGuestCart = next.allowGuestCart;
        row.enableRepeatOrder = next.enableRepeatOrder;
        row.enableCreditView = next.enableCreditView;
        row.enableNotifications = next.enableNotifications;
        row.defaultHomeLayout = next.defaultHomeLayout;
        row.showBanner = next.showBanner;
        row.selectedLanguageCode = next.selectedLanguageCode;
      }
      await this.repo.save(row);
      if (languageChanged) {
        this.localization.invalidate(`tenant:${tenantId}`);
        const app = await this.appRepo.findOne({
          where: { tenantId },
          select: ['tenantId', 'status'],
        });
        if (app && app.status !== 'skipped') {
          app.status = 'pending_build';
          await this.appRepo.save(app);
        }
      }
      return this.fromRow(
        row,
        {
          industryId: current.industryId,
          industryName: current.industryName,
        },
        next.selectedLanguageCode,
        await this.languageContractForTenant(tenantId),
      );
    } catch (e) {
      if (this.isMissingSettingsTableError(e)) {
        throw new BadRequestException(
          'tenant_app_settings is missing. From the backend folder run: npm run migration:run',
        );
      }
      if (this.isMissingSettingsColumnError(e)) {
        throw new BadRequestException(
          'tenant_app_settings is missing new app-config columns. From the backend folder run: npm run migration:run',
        );
      }
      throw e;
    }
  }

  async assertGuestCartEnabled(tenantId: string): Promise<void> {
    const s = await this.getForTenant(tenantId);
    if (!s.allowGuestCart) {
      throw new ForbiddenException('Guest cart is not enabled for this store.');
    }
  }
}
