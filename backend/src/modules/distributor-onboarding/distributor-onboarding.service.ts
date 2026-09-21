import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { EntityManager, Repository } from 'typeorm';
import { Tenant } from '../../common/entities/tenant.entity';
import { Theme } from '../../common/entities/theme.entity';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantDomain } from '../../common/entities/tenant-domain.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantTheme } from '../../common/entities/tenant-theme.entity';
import { TenantThemeSettings } from '../../common/entities/tenant-theme-settings.entity';
import { TenantAppSettings } from '../../common/entities/tenant-app-settings.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { ThemeComboMapping } from '../../common/entities/theme-combo-mapping.entity';
import { isValidCubePackageName } from '../../common/utils/android-app-package';
import {
  isPlausibleCustomDomainHost,
  isValidSubdomainLabel,
  normalizeCustomDomainHost,
  normalizeSubdomainLabel,
  slugifyBrandNameToSubdomain,
} from '../../common/utils/subdomain-slug';
import { SaveOnboardingStepDto } from './dto/save-onboarding-step.dto';

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function uuidOrNull(v: unknown): string | null {
  const s = str(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

const UPI_ID_RE = /^[A-Za-z0-9._-]{2,128}@[A-Za-z][A-Za-z0-9._-]{2,64}$/;

export type PlatformLanguageDto = {
  id: string;
  name: string;
  code: string;
  direction: 'ltr' | 'rtl';
  status: 'active' | 'disabled';
  isDefault: boolean;
};

const PLATFORM_LANGUAGES: PlatformLanguageDto[] = [
  { id: 'lang-en', name: 'English', code: 'en', direction: 'ltr', status: 'active', isDefault: true },
  { id: 'lang-hi', name: 'Hindi', code: 'hi', direction: 'ltr', status: 'active', isDefault: false },
  { id: 'lang-fr', name: 'French', code: 'fr', direction: 'ltr', status: 'active', isDefault: false },
  { id: 'lang-es', name: 'Spanish', code: 'es', direction: 'ltr', status: 'disabled', isDefault: false },
  { id: 'lang-ar', name: 'Arabic', code: 'ar', direction: 'rtl', status: 'disabled', isDefault: false },
  { id: 'lang-de', name: 'German', code: 'de', direction: 'ltr', status: 'disabled', isDefault: false },
];

export function activePlatformLanguages(): PlatformLanguageDto[] {
  return PLATFORM_LANGUAGES.filter((language) => language.status === 'active').map((language) => ({ ...language }));
}

export function normalizePlatformLanguageCode(value: unknown): string {
  const code = str(value)
    .toLowerCase()
    .replace(/[^a-z-]/g, '')
    .slice(0, 16);
  return code || 'en';
}

export type OnboardingStatusDto = {
  status: 'in_progress' | 'complete';
  currentStep: number;
  payload: Record<string, unknown>;
  completedAt: string | null;
};

export type StoreUrlPreviewDto = {
  subdomain: string;
  /** Platform apex from config (suffix after the subdomain label). */
  platformDomain: string;
  productionHost: string;
  devPreviewUrl: string;
  message: string;
};

export type SubdomainAvailabilityDto = {
  normalized: string;
  available: boolean;
  suggestion?: string;
  reason?: 'invalid' | 'taken';
};

@Injectable()
export class DistributorOnboardingService {
  private readonly languagesPath = join(process.cwd(), 'storage', 'platform-languages.json');

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(TenantOnboarding)
    private readonly onboardingRepo: Repository<TenantOnboarding>,
    @InjectRepository(TenantProfile)
    private readonly profileRepo: Repository<TenantProfile>,
    @InjectRepository(TenantBranding)
    private readonly brandingRepo: Repository<TenantBranding>,
    @InjectRepository(TenantDomain)
    private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(TenantDistributorApp)
    private readonly appRepo: Repository<TenantDistributorApp>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantTheme)
    private readonly tenantThemeRepo: Repository<TenantTheme>,
    @InjectRepository(TenantThemeSettings)
    private readonly tenantThemeSettingsRepo: Repository<TenantThemeSettings>,
    @InjectRepository(Theme)
    private readonly themeRepo: Repository<Theme>,
    @InjectRepository(ThemeComboMapping)
    private readonly themeComboRepo: Repository<ThemeComboMapping>,
  ) {}

  /**
   * Preview-only: first available subdomain from saved store name (does not write DB).
   */
  async previewStoreUrl(tenantId: string, brandOverride?: string): Promise<StoreUrlPreviewDto> {
    const row = await this.onboardingRepo.findOne({ where: { tenantId } });
    const p = (row?.payloadJson ?? {}) as Record<string, unknown>;
    const brand =
      str(brandOverride) || str(p['storeDisplayName']) || str(p['businessName']);
    if (!brand) {
      throw new BadRequestException(
        'Add your store name in the branding step first — your URL is generated from it.',
      );
    }
    const subdomain = await this.pickUniqueSubdomain(
      this.domainRepo.manager,
      brand,
      tenantId,
    );
    const platformDomain = this.config.get<string>('app.platformDomain', 'platform.local');
    const port = this.config.get<number>('storefront.devPort', 5175);
    const productionHost = `${subdomain}.${platformDomain}`;
    const devPreviewUrl = `http://${subdomain}.localhost:${port}`;
    return {
      subdomain,
      platformDomain,
      productionHost,
      devPreviewUrl,
      message:
        'Your store URL is created from your brand name. You can connect your own domain later in Settings → Domain.',
    };
  }

  /**
   * Check whether a subdomain label is free for onboarding (current tenant may keep its own).
   */
  async checkSubdomainAvailability(
    tenantId: string,
    raw: string,
  ): Promise<SubdomainAvailabilityDto> {
    const normalized = normalizeSubdomainLabel(raw);
    if (!normalized || !isValidSubdomainLabel(normalized)) {
      return { normalized, available: false, reason: 'invalid' };
    }
    const conflict = await this.domainRepo.findOne({
      where: { subdomain: normalized },
      select: ['tenantId'],
    });
    if (!conflict) {
      return { normalized, available: true };
    }
    if (conflict.tenantId === tenantId) {
      return { normalized, available: true };
    }
    for (let n = 1; n < 200; n++) {
      const cand = `${normalized}${n}`;
      if (cand.length > 63) break;
      const row = await this.domainRepo.findOne({
        where: { subdomain: cand },
        select: ['tenantId'],
      });
      if (!row || row.tenantId === tenantId) {
        return { normalized, available: false, reason: 'taken', suggestion: cand };
      }
    }
    return { normalized, available: false, reason: 'taken' };
  }

  private async assertSubdomainAssignable(
    em: EntityManager,
    subdomain: string,
    tenantId: string,
  ): Promise<void> {
    const row = await em.findOne(TenantDomain, {
      where: { subdomain },
      select: ['tenantId'],
    });
    if (row && row.tenantId !== tenantId) {
      throw new BadRequestException(
        'This subdomain is already taken. Go back to the domain step and choose another.',
      );
    }
  }

  private async assertCustomDomainAssignable(
    em: EntityManager,
    host: string,
    tenantId: string,
  ): Promise<void> {
    const h = host.toLowerCase();
    const variants = h.startsWith('www.') ? [h, h.slice(4)] : [h, `www.${h}`];
    const uniq = [...new Set(variants)];
    for (const v of uniq) {
      const row = await em.findOne(TenantDomain, {
        where: { customDomain: v },
        select: ['tenantId'],
      });
      if (row && row.tenantId !== tenantId) {
        throw new BadRequestException(
          'This custom domain is already linked to another store. Use a different domain.',
        );
      }
    }
  }

  private async pickUniqueSubdomain(
    em: EntityManager,
    brandName: string,
    tenantId: string,
  ): Promise<string> {
    const base = slugifyBrandNameToSubdomain(brandName);
    for (let n = 0; n < 200; n++) {
      const candidate = n === 0 ? base : `${base}${n}`;
      const conflict = await em.findOne(TenantDomain, {
        where: { subdomain: candidate },
        select: ['tenantId', 'subdomain'],
      });
      if (!conflict) {
        return candidate;
      }
      if (conflict.tenantId === tenantId) {
        return candidate;
      }
    }
    throw new BadRequestException(
      'Could not find an available subdomain for this name. Try a different store name.',
    );
  }

  /** Called after every new tenant row (OTP + email self-register). */
  async ensureInProgressForNewTenant(tenantId: string): Promise<void> {
    const exists = await this.onboardingRepo.exist({ where: { tenantId } });
    if (exists) return;
    await this.onboardingRepo.save(
      this.onboardingRepo.create({
        tenantId,
        currentStep: 1,
        status: 'in_progress',
        payloadJson: {},
        completedAt: null,
      }),
    );
  }

  async getStatus(tenantId: string): Promise<OnboardingStatusDto> {
    const row = await this.onboardingRepo.findOne({ where: { tenantId } });
    if (!row) {
      return {
        status: 'complete',
        currentStep: 0,
        payload: {},
        completedAt: null,
      };
    }
    return {
      status: row.status,
      currentStep: row.currentStep,
      payload: (row.payloadJson ?? {}) as Record<string, unknown>,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    };
  }

  async listLanguages(): Promise<PlatformLanguageDto[]> {
    return this.readLanguages();
  }

  async saveLanguages(rows: PlatformLanguageDto[]): Promise<PlatformLanguageDto[]> {
    const sanitized = this.sanitizeLanguages(rows);
    await fs.mkdir(dirname(this.languagesPath), { recursive: true });
    await fs.writeFile(this.languagesPath, JSON.stringify(sanitized, null, 2), 'utf8');
    return sanitized;
  }

  async saveStep(tenantId: string, dto: SaveOnboardingStepDto): Promise<OnboardingStatusDto> {
    let row = await this.onboardingRepo.findOne({ where: { tenantId } });
    if (!row) {
      row = this.onboardingRepo.create({
        tenantId,
        currentStep: dto.step,
        status: 'in_progress',
        payloadJson: {},
        completedAt: null,
      });
    }
    if (row.status === 'complete') {
      throw new BadRequestException('Onboarding is already complete.');
    }
    const prev = (row.payloadJson ?? {}) as Record<string, unknown>;
    const incoming = dto.data ?? {};
    const nextPayload = { ...prev, ...incoming };
    if ('selectedLanguageCode' in incoming || 'selectedLanguageCode' in prev) {
      const selectedLanguageCode = this.normalizeLanguageCodeFromList(
        nextPayload['selectedLanguageCode'],
        await this.readLanguages(),
      );
      nextPayload['selectedLanguageCode'] = selectedLanguageCode;
      nextPayload['languages'] = [selectedLanguageCode];
    }
    row.payloadJson = nextPayload;
    row.currentStep = Math.max(row.currentStep, dto.step);
    await this.onboardingRepo.save(row);
    return this.getStatus(tenantId);
  }

  async complete(tenantId: string): Promise<OnboardingStatusDto> {
    const row = await this.onboardingRepo.findOne({ where: { tenantId } });
    if (!row) throw new NotFoundException('Onboarding not found.');
    if (row.status === 'complete') {
      return this.getStatus(tenantId);
    }
    const p = (row.payloadJson ?? {}) as Record<string, unknown>;

    const businessName = str(p['businessName']);
    const ownerName = str(p['ownerName']);
    const industryId = uuidOrNull(p['industry']);
    const countryId = uuidOrNull(p['countryId']);
    const stateId = uuidOrNull(p['stateId']);
    const cityId = uuidOrNull(p['cityId']);
    const platform = str(p['platform']);
    const storeDisplayName = str(p['storeDisplayName']);
    const themeUuid = uuidOrNull(p['themeId']);
    const mobileThemeUuid = uuidOrNull(p['mobileThemeId']);
    const comboUuid = uuidOrNull(p['comboId']);
    const appName = str(p['appName']);
    const appPackage = str(p['appPackage']);
    const selectedLanguageCode = this.normalizeLanguageCodeFromList(
      p['selectedLanguageCode'],
      await this.readLanguages(),
    );
    const gstRaw = str(p['gst']);
    const hasGst = !!gstRaw;
    const gstVerified = p['gstVerified'] === true;
    const accountHolderName = str(p['accountHolderName']);
    const bankName = str(p['bankName']);
    const accountNumber = str(p['accountNumber']).replace(/[^\d]/g, '');
    const ifsc = str(p['ifsc']).replace(/\s/g, '').toUpperCase();
    const branch = str(p['branch']);
    const upiId = str(p['upiId']).replace(/\s/g, '').toLowerCase();
    if (hasGst && !gstVerified) {
      throw new BadRequestException(
        'Verify your GSTIN with “Verify GST”, or clear the GST field / use “Skip GST”.',
      );
    }

    if (!businessName || !ownerName || !industryId || !countryId) {
      throw new BadRequestException(
        'Missing required profile fields (business name, owner, industry, country).',
      );
    }
    if (!accountHolderName || !bankName || !accountNumber || !ifsc || !upiId) {
      throw new BadRequestException(
        'Bank account holder, bank name, account number, IFSC and UPI ID are required.',
      );
    }
    if (!UPI_ID_RE.test(upiId)) {
      throw new BadRequestException(
        'Enter a valid UPI ID such as name@bank. Do not add +91, spaces, account number or IFSC.',
      );
    }
    if (!platform || (platform !== 'website' && platform !== 'website_and_mobile')) {
      throw new BadRequestException('Choose a valid platform option.');
    }
    if (!storeDisplayName || !themeUuid) {
      throw new BadRequestException('Store display name and theme are required.');
    }
    if (platform === 'website_and_mobile' && (!appName || !appPackage)) {
      throw new BadRequestException('App name and package name are required for website + mobile.');
    }
    if (platform === 'website_and_mobile' && !isValidCubePackageName(appPackage)) {
      throw new BadRequestException(
        'Package name must be co.cube.yourname — lowercase letters and digits only after co.cube., last segment at least 3 characters.',
      );
    }

    const webTheme = await this.themeRepo.findOne({
      where: { id: themeUuid, status: 'ACTIVE' },
      select: ['id', 'themeChannel'],
    });
    if (!webTheme || (webTheme.themeChannel ?? 'WEB') !== 'WEB') {
      throw new BadRequestException('Selected web theme is invalid or inactive.');
    }

    let resolvedMobileThemeId: string | null = null;
    let resolvedComboId: string | null = null;
    if (platform === 'website_and_mobile') {
      if (comboUuid) {
        const combo = await this.themeComboRepo.findOne({
          where: { id: comboUuid, status: 'ACTIVE' },
          select: ['id', 'webThemeId', 'mobileThemeId'],
        });
        if (!combo) {
          throw new BadRequestException('Selected theme combo is invalid or inactive.');
        }
        if (combo.webThemeId !== themeUuid) {
          throw new BadRequestException('Selected web theme does not match the chosen combo.');
        }
        resolvedComboId = combo.id;
        resolvedMobileThemeId = combo.mobileThemeId;
      } else if (mobileThemeUuid) {
        resolvedMobileThemeId = mobileThemeUuid;
      } else {
        const combo = await this.themeComboRepo.findOne({
          where: { webThemeId: themeUuid, status: 'ACTIVE' },
          select: ['id', 'mobileThemeId'],
        });
        if (combo) {
          resolvedComboId = combo.id;
          resolvedMobileThemeId = combo.mobileThemeId;
        }
      }
      if (!resolvedMobileThemeId) {
        throw new BadRequestException('Select a mobile theme (combo pack) in step 5.');
      }
      const mobileTheme = await this.themeRepo.findOne({
        where: { id: resolvedMobileThemeId, status: 'ACTIVE' },
        select: ['id', 'themeChannel'],
      });
      if (!mobileTheme || mobileTheme.themeChannel !== 'MOBILE') {
        throw new BadRequestException('Selected mobile theme is invalid or inactive.');
      }
    }

    const domainMode = str(p['domainMode']) === 'custom' ? 'custom' : 'subdomain';
    const payloadSub = normalizeSubdomainLabel(str(p['subdomain']));
    const customHost = normalizeCustomDomainHost(str(p['customDomain']));

    await this.profileRepo.manager.transaction(async (em) => {
      const brandSource = storeDisplayName || businessName;
      let finalSub: string;
      let finalCustom: string | null = null;
      let finalType: 'subdomain' | 'custom';

      if (domainMode === 'custom') {
        if (!customHost || !isPlausibleCustomDomainHost(customHost)) {
          throw new BadRequestException(
            'Enter a valid custom domain (for example www.yourstore.com).',
          );
        }
        await this.assertCustomDomainAssignable(em, customHost, tenantId);
        if (payloadSub && isValidSubdomainLabel(payloadSub)) {
          await this.assertSubdomainAssignable(em, payloadSub, tenantId);
          finalSub = payloadSub;
        } else {
          finalSub = await this.pickUniqueSubdomain(em, brandSource, tenantId);
        }
        finalCustom = customHost;
        finalType = 'custom';
      } else {
        if (payloadSub && isValidSubdomainLabel(payloadSub)) {
          await this.assertSubdomainAssignable(em, payloadSub, tenantId);
          finalSub = payloadSub;
        } else {
          finalSub = await this.pickUniqueSubdomain(em, brandSource, tenantId);
        }
        finalType = 'subdomain';
        finalCustom = null;
      }

      const existingProfile = await em.findOne(TenantProfile, { where: { tenantId } });
      const prof = existingProfile ?? em.create(TenantProfile, { tenantId });
      prof.businessName = businessName;
      prof.ownerName = ownerName;
      prof.industryId = industryId;
      prof.gstNumber = hasGst ? gstRaw.toUpperCase() : null;
      prof.gstVerified = hasGst ? gstVerified : false;
      prof.gstLegalName =
        hasGst && gstVerified ? str(p['gstLegalName']) || null : null;
      prof.gstState = hasGst && gstVerified ? str(p['gstApiState']) || null : null;
      prof.gstStatus = hasGst && gstVerified ? str(p['gstApiStatus']) || null : null;
      prof.countryId = countryId;
      prof.stateId = stateId;
      prof.cityId = cityId;
      prof.address = str(p['address']) || null;
      prof.pincode = str(p['pincode']) || null;
      prof.phone = str(p['phone']) || null;
      prof.email = str(p['email']) || null;
      await em.save(prof);

      let brand = await em.findOne(TenantBranding, { where: { tenantId } });
      if (!brand) brand = em.create(TenantBranding, { tenantId });
      brand.logoUrl = str(p['logoUrl']) || null;
      brand.logoDataUrl = str(p['logoDataUrl']) || null;
      brand.primaryColor = str(p['primaryColor']) || null;
      brand.secondaryColor = str(p['secondaryColor']) || null;
      brand.tagline = str(p['tagline']) || null;
      brand.themeId = themeUuid || null;
      await em.save(brand);

      let tenantTheme = await em.findOne(TenantTheme, { where: { tenantId } });
      if (!tenantTheme) {
        tenantTheme = em.create(TenantTheme, { tenantId, themeId: themeUuid });
      } else {
        tenantTheme.themeId = themeUuid;
      }
      await em.save(tenantTheme);

      let settings = await em.findOne(TenantThemeSettings, { where: { tenantId } });
      if (!settings) {
        settings = em.create(TenantThemeSettings, {
          tenantId,
          webThemeId: themeUuid,
          mobileThemeId: platform === 'website_and_mobile' ? resolvedMobileThemeId : null,
          comboId: platform === 'website_and_mobile' ? resolvedComboId : null,
          primaryColor: str(p['primaryColor']) || null,
          secondaryColor: str(p['secondaryColor']) || null,
          logoUrl: str(p['logoUrl']) || null,
        });
      } else {
        settings.webThemeId = themeUuid;
        settings.mobileThemeId = platform === 'website_and_mobile' ? resolvedMobileThemeId : null;
        settings.comboId = platform === 'website_and_mobile' ? resolvedComboId : null;
        settings.primaryColor = str(p['primaryColor']) || null;
        settings.secondaryColor = str(p['secondaryColor']) || null;
        settings.logoUrl = str(p['logoUrl']) || null;
      }
      await em.save(settings);

      let dom = await em.findOne(TenantDomain, { where: { tenantId } });
      if (!dom) dom = em.create(TenantDomain, { tenantId });
      dom.domainType = finalType;
      dom.subdomain = finalSub;
      dom.customDomain = finalCustom;
      dom.status = 'active';
      await em.save(dom);

      let appRow = await em.findOne(TenantDistributorApp, { where: { tenantId } });
      if (!appRow) appRow = em.create(TenantDistributorApp, { tenantId });
      appRow.appName = platform === 'website_and_mobile' ? appName : storeDisplayName;
      appRow.packageName = platform === 'website_and_mobile' ? appPackage : '';
      appRow.splashScreen = str(p['splashColor']) || null;
      appRow.iconUrl = str(p['logoUrl']) || str(p['logoDataUrl']) || null;
      /** Metadata saved; APK is produced later from the dashboard (no wizard-time build). */
      appRow.status = platform === 'website_and_mobile' ? 'pending_build' : 'skipped';
      await em.save(appRow);

      let appSettings = await em.findOne(TenantAppSettings, { where: { tenantId } });
      if (!appSettings) appSettings = em.create(TenantAppSettings, { tenantId });
      appSettings.selectedLanguageCode = selectedLanguageCode;
      await em.save(appSettings);
    });

    row.payloadJson = {
      ...(row.payloadJson ?? {}),
      selectedLanguageCode,
      languages: [selectedLanguageCode],
      accountHolderName,
      bankName,
      accountNumber,
      ifsc,
      branch,
      upiId,
    };

    row.status = 'complete';
    row.completedAt = new Date();
    row.currentStep = 7;
    await this.onboardingRepo.save(row);

    await this.tenantRepo.update(
      { id: tenantId },
      { name: businessName.slice(0, 255) },
    );

    return this.getStatus(tenantId);
  }

  private async readLanguages(): Promise<PlatformLanguageDto[]> {
    try {
      const raw = await fs.readFile(this.languagesPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return this.sanitizeLanguages(Array.isArray(parsed) ? parsed : []);
    } catch {
      return PLATFORM_LANGUAGES.map((language) => ({ ...language }));
    }
  }

  private sanitizeLanguages(rows: unknown[]): PlatformLanguageDto[] {
    const seen = new Set<string>();
    const out: PlatformLanguageDto[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const code = str(r['code']).toLowerCase().replace(/[^a-z-]/g, '');
      const name = str(r['name']);
      if (!code || !name || seen.has(code)) continue;
      seen.add(code);
      out.push({
        id: str(r['id']) || `lang-${code}`,
        name,
        code,
        direction: r['direction'] === 'rtl' ? 'rtl' : 'ltr',
        status: r['status'] === 'disabled' ? 'disabled' : 'active',
        isDefault: r['isDefault'] === true,
      });
    }
    if (!out.length) return PLATFORM_LANGUAGES.map((language) => ({ ...language }));
    const defaultActive = out.find((language) => language.isDefault && language.status === 'active');
    if (!defaultActive) {
      const firstActive = out.find((language) => language.status === 'active') ?? out[0]!;
      for (const language of out) language.isDefault = language.code === firstActive.code;
      firstActive.status = 'active';
    } else {
      for (const language of out) language.isDefault = language.code === defaultActive.code;
    }
    return out;
  }

  private normalizeLanguageCodeFromList(value: unknown, languages: PlatformLanguageDto[]): string {
    const active = languages.filter((language) => language.status === 'active');
    const fallback = active.find((language) => language.isDefault)?.code ?? active[0]?.code ?? 'en';
    const code = str(value).toLowerCase();
    return active.some((language) => language.code === code) ? code : fallback;
  }
}
