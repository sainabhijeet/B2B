/**
 * Registers one complete local demo distributor for every active industry except
 * Jewelry / Diamond. The script is intentionally idempotent and defaults to a
 * dry run; pass --apply to create/finish the accounts.
 *
 * Run from backend/:
 *   node_modules/.bin/ts-node.cmd src/scripts/register-industry-distributors.ts
 *   node_modules/.bin/ts-node.cmd src/scripts/register-industry-distributors.ts --apply
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import dataSource from '../database/data-source';
import configuration from '../config/configuration';
import { AuditLog } from '../common/entities/audit-log.entity';
import { Country } from '../common/entities/country.entity';
import { GeoCity } from '../common/entities/geo-city.entity';
import { GeoState } from '../common/entities/geo-state.entity';
import { Industry } from '../common/entities/industry.entity';
import { Plan } from '../common/entities/plan.entity';
import { ReferralCode } from '../common/entities/referral-code.entity';
import { ReferralCommission } from '../common/entities/referral-commission.entity';
import { ReferralConversion } from '../common/entities/referral-conversion.entity';
import { ReferralSetting } from '../common/entities/referral-setting.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { TenantBranding } from '../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../common/entities/tenant-app.entity';
import { TenantDomain } from '../common/entities/tenant-domain.entity';
import { TenantOnboarding } from '../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../common/entities/tenant-profile.entity';
import { TenantTheme } from '../common/entities/tenant-theme.entity';
import { TenantThemeSettings } from '../common/entities/tenant-theme-settings.entity';
import { Theme } from '../common/entities/theme.entity';
import { ThemeComboMapping } from '../common/entities/theme-combo-mapping.entity';
import { User } from '../common/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditLogsService } from '../modules/audit-logs/audit-logs.service';
import { DistributorOnboardingService } from '../modules/distributor-onboarding/distributor-onboarding.service';
import { ReferralsService } from '../modules/referrals/referrals.service';
import { TenantsService } from '../modules/tenants/tenants.service';
import { UsersService } from '../modules/users/users.service';
import { TenantSchemaService } from '../tenancy/tenant-schema.service';

type CatalogTheme = {
  industryOrder: number;
  industryId: string;
  industry: string;
  platform: 'WEB' | 'MOBILE';
  themeName: string;
  slug: string;
  demoBrand: string;
  valid: boolean;
};

type CatalogFile = {
  industryCount: number;
  totalThemeCount: number;
  themes: CatalogTheme[];
};

type RegistrationPlan = {
  industryOrder: number;
  industryId: string;
  industry: string;
  businessName: string;
  ownerName: string;
  nationalMobile: string;
  loginMobile: string;
  email: string;
  websiteName: string;
  appName: string;
  appPackage: string;
  subdomain: string;
  webThemeSlug: string;
  mobileThemeSlug: string;
  webThemeName: string;
  mobileThemeName: string;
  demoBankAccount: string;
  demoIfsc: string;
  demoUpiId: string;
  primaryColor: string;
  secondaryColor: string;
};

type RegistrationResult = RegistrationPlan & {
  tenantId: string;
  onboardingStatus: string;
  storefrontUrl: string;
  action: 'created' | 'completed_existing' | 'already_complete';
};

const EXCLUDED_INDUSTRY = 'Jewelry / Diamond';
const INDIA_ISO = 'IN';
const STATE_NAME = 'Gujarat';
const CITY_NAME = 'Ahmedabad';
const OWNER_NAME = 'Demo Account Manager';
const EMAIL_DOMAIN = 'industry-distributors.cube.test';
const PLATFORM_DOMAIN = process.env.APP_PLATFORM_DOMAIN?.trim() || 'platform.local';
const REPORT_BASENAME = 'industry-distributor-registrations-2026-10-26';

const BRAND_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['#0f766e', '#134e4a'],
  ['#1d4ed8', '#1e3a8a'],
  ['#7c3aed', '#4c1d95'],
  ['#b45309', '#78350f'],
  ['#be123c', '#881337'],
  ['#0369a1', '#164e63'],
  ['#15803d', '#14532d'],
  ['#4338ca', '#312e81'],
];

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: RegistrationResult[]): string {
  const columns: Array<keyof RegistrationResult> = [
    'industryOrder',
    'industry',
    'businessName',
    'ownerName',
    'nationalMobile',
    'loginMobile',
    'email',
    'websiteName',
    'appName',
    'appPackage',
    'subdomain',
    'storefrontUrl',
    'webThemeName',
    'mobileThemeName',
    'tenantId',
    'onboardingStatus',
    'action',
  ];
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\r\n') + '\r\n';
}

async function loadCatalog(): Promise<CatalogFile> {
  const catalogPath = resolve(
    process.cwd(),
    '..',
    'exports',
    'industry-theme-zips-v2',
    'catalog.json',
  );
  return JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CatalogFile;
}

function buildPlan(industries: Industry[], catalog: CatalogFile): RegistrationPlan[] {
  const webByIndustryId = new Map(
    catalog.themes
      .filter((theme) => theme.platform === 'WEB' && theme.valid)
      .map((theme) => [theme.industryId, theme]),
  );
  const mobileByIndustryId = new Map(
    catalog.themes
      .filter((theme) => theme.platform === 'MOBILE' && theme.valid)
      .map((theme) => [theme.industryId, theme]),
  );

  return industries
    .filter((industry) => industry.name !== EXCLUDED_INDUSTRY)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((industry, index) => {
      const web = webByIndustryId.get(industry.industryId);
      const mobile = mobileByIndustryId.get(industry.industryId);
      if (!web || !mobile) {
        throw new Error(`Catalog theme pair is missing for ${industry.name}.`);
      }
      const brand = web.demoBrand.trim();
      if (!brand) throw new Error(`Professional brand is missing for ${industry.name}.`);
      const brandSlug = slugify(brand);
      const packageBrand = compact(brand).slice(0, 40);
      const nationalMobile = String(6_000_000_001 + index);
      const suffix = String(industry.displayOrder).padStart(2, '0');
      const [primaryColor, secondaryColor] = BRAND_COLORS[index % BRAND_COLORS.length];
      return {
        industryOrder: industry.displayOrder,
        industryId: industry.industryId,
        industry: industry.name,
        businessName: `${brand} Distribution Private Limited`,
        ownerName: OWNER_NAME,
        nationalMobile,
        loginMobile: `+91 ${nationalMobile}`,
        email: `owner.${suffix}.${brandSlug}@${EMAIL_DOMAIN}`,
        websiteName: `${brand} Trade`,
        appName: `${brand} B2B`,
        appPackage: `co.cube.${packageBrand}b2b`,
        subdomain: `${brandSlug}-b2b`,
        webThemeSlug: web.slug,
        mobileThemeSlug: mobile.slug,
        webThemeName: web.themeName,
        mobileThemeName: mobile.themeName,
        demoBankAccount: `600000${String(industry.displayOrder).padStart(6, '0')}`,
        demoIfsc: `CUBE${String(industry.displayOrder).padStart(7, '0')}`,
        demoUpiId: `${packageBrand.slice(0, 40)}@cubetest`,
        primaryColor,
        secondaryColor,
      };
    });
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await dataSource.initialize();

  try {
    const config = new ConfigService(configuration());
    const industryRepo = dataSource.getRepository(Industry);
    const countryRepo = dataSource.getRepository(Country);
    const stateRepo = dataSource.getRepository(GeoState);
    const cityRepo = dataSource.getRepository(GeoCity);
    const themeRepo = dataSource.getRepository(Theme);
    const userRepo = dataSource.getRepository(User);
    const tenantRepo = dataSource.getRepository(Tenant);
    const profileRepo = dataSource.getRepository(TenantProfile);
    const brandingRepo = dataSource.getRepository(TenantBranding);
    const onboardingRepo = dataSource.getRepository(TenantOnboarding);
    const domainRepo = dataSource.getRepository(TenantDomain);
    const tenantAppRepo = dataSource.getRepository(TenantDistributorApp);
    const tenantThemeRepo = dataSource.getRepository(TenantTheme);
    const tenantThemeSettingsRepo = dataSource.getRepository(TenantThemeSettings);
    const themeComboRepo = dataSource.getRepository(ThemeComboMapping);

    const auditLogs = new AuditLogsService(dataSource.getRepository(AuditLog));
    const users = new UsersService(userRepo, auditLogs);
    const onboarding = new DistributorOnboardingService(
      config,
      onboardingRepo,
      profileRepo,
      brandingRepo,
      domainRepo,
      tenantAppRepo,
      tenantRepo,
      tenantThemeRepo,
      tenantThemeSettingsRepo,
      themeRepo,
      themeComboRepo,
    );
    const referrals = new ReferralsService(
      dataSource.getRepository(ReferralCode),
      dataSource.getRepository(ReferralConversion),
      dataSource.getRepository(ReferralCommission),
      dataSource.getRepository(ReferralSetting),
      userRepo,
      dataSource.getRepository(Subscription),
      dataSource.getRepository(Plan),
    );
    const tenantSchemas = new TenantSchemaService(dataSource, tenantRepo, config);
    const tenants = new TenantsService(
      dataSource,
      tenantRepo,
      dataSource.getRepository(Plan),
      dataSource.getRepository(SystemConfig),
      dataSource.getRepository(Subscription),
      userRepo,
      users,
      auditLogs,
      referrals,
      onboarding,
      tenantSchemas,
    );

    const industries = await industryRepo.find({
      where: { status: 'active' },
      order: { displayOrder: 'ASC' },
    });
    if (industries.length !== 47) {
      throw new Error(`Expected 47 active industries, found ${industries.length}.`);
    }
    if (!industries.some((industry) => industry.name === EXCLUDED_INDUSTRY)) {
      throw new Error(`${EXCLUDED_INDUSTRY} is not present; exclusion cannot be verified.`);
    }

    const catalog = await loadCatalog();
    const plan = buildPlan(industries, catalog);
    if (plan.length !== 46) {
      throw new Error(`Expected 46 target industries, planned ${plan.length}.`);
    }

    const india = await countryRepo.findOne({ where: { isoCode: INDIA_ISO, status: 'active' } });
    if (!india) throw new Error('Active India country row was not found.');
    const state = await stateRepo.findOne({
      where: { countryId: india.countryId, name: STATE_NAME, status: 'active' },
    });
    if (!state) throw new Error(`Active ${STATE_NAME} state row was not found.`);
    const city = await cityRepo.findOne({
      where: { stateId: state.stateId, name: CITY_NAME, status: 'active' },
    });
    if (!city) throw new Error(`Active ${CITY_NAME} city row was not found.`);

    const themePairs = new Map<string, { web: Theme; mobile: Theme }>();
    for (const row of plan) {
      const web = await themeRepo.findOne({
        where: { slug: row.webThemeSlug, status: 'ACTIVE', themeChannel: 'WEB' },
      });
      const mobile = await themeRepo.findOne({
        where: { slug: row.mobileThemeSlug, status: 'ACTIVE', themeChannel: 'MOBILE' },
      });
      if (!web || !mobile) {
        throw new Error(
          `Active DB theme pair is missing for ${row.industry}: ${row.webThemeSlug} / ${row.mobileThemeSlug}`,
        );
      }
      themePairs.set(row.industryId, { web, mobile });

      const expectedPhone = `91${row.nationalMobile}`;
      const phoneOwner = await userRepo.findOne({ where: { phone: expectedPhone } });
      const emailOwner = await userRepo.findOne({ where: { email: row.email } });
      if (phoneOwner && phoneOwner.id !== emailOwner?.id) {
        throw new Error(`Mobile collision for ${row.nationalMobile} (${row.industry}).`);
      }
      if (emailOwner && emailOwner.phone !== expectedPhone) {
        throw new Error(`Existing scripted email has an unexpected mobile: ${row.email}.`);
      }
      const packageOwner = await tenantAppRepo.findOne({ where: { packageName: row.appPackage } });
      if (packageOwner && packageOwner.tenantId !== emailOwner?.tenantId) {
        throw new Error(`App package collision for ${row.appPackage}.`);
      }
      const domainOwner = await domainRepo.findOne({ where: { subdomain: row.subdomain } });
      if (domainOwner && domainOwner.tenantId !== emailOwner?.tenantId) {
        throw new Error(`Subdomain collision for ${row.subdomain}.`);
      }
    }

    console.log(
      `[industry-register] preflight ok: targets=${plan.length}, excluded="${EXCLUDED_INDUSTRY}", mode=${apply ? 'APPLY' : 'DRY_RUN'}`,
    );
    if (!apply) {
      for (const row of plan) {
        console.log(
          `[dry-run] ${String(row.industryOrder).padStart(2, '0')} | ${row.industry} | ${row.nationalMobile} | ${row.websiteName} | ${row.appName}`,
        );
      }
      return;
    }

    const results: RegistrationResult[] = [];
    for (const row of plan) {
      const themes = themePairs.get(row.industryId);
      if (!themes) throw new Error(`Preflight theme pair disappeared for ${row.industry}.`);

      let owner = await userRepo.findOne({ where: { email: row.email } });
      let action: RegistrationResult['action'];
      if (!owner) {
        const password = `${randomBytes(24).toString('base64url')}Aa1!`;
        const allocated = await tenants.allocateSlugAndNameForNewTenant(row.email);
        await tenants.create({
          slug: allocated.slug,
          name: allocated.name,
          ownerEmail: row.email,
          ownerPassword: password,
          ownerPhone: `91${row.nationalMobile}`,
          countryId: india.countryId,
        });
        owner = await userRepo.findOne({ where: { email: row.email } });
        action = 'created';
      } else {
        action = 'completed_existing';
      }
      if (!owner?.tenantId || owner.role !== UserRole.OWNER) {
        throw new Error(`Owner account/tenant was not created correctly for ${row.industry}.`);
      }

      const current = await onboardingRepo.findOne({ where: { tenantId: owner.tenantId } });
      if (current?.status === 'complete') {
        action = 'already_complete';
      } else {
        await onboarding.saveStep(owner.tenantId, {
          step: 7,
          data: {
            businessName: row.businessName,
            ownerName: row.ownerName,
            phone: row.nationalMobile,
            email: row.email,
            industry: row.industryId,
            countryId: india.countryId,
            stateId: state.stateId,
            cityId: city.cityId,
            country: india.name,
            state: state.name,
            city: city.name,
            gst: '',
            gstVerified: false,
            address: `${row.websiteName} Distribution Centre, Ahmedabad, Gujarat, India`,
            pincode: '380001',
            accountHolderName: row.businessName,
            bankName: 'CUBE Demo Bank',
            accountNumber: row.demoBankAccount,
            ifsc: row.demoIfsc,
            branch: 'Ahmedabad Demo Branch',
            upiId: row.demoUpiId,
            platform: 'website_and_mobile',
            storeDisplayName: row.websiteName,
            brandStyle: 'modern minimal',
            primaryColor: row.primaryColor,
            secondaryColor: row.secondaryColor,
            tagline: `${row.industry} distribution, simplified.`,
            selectedLanguageCode: 'en',
            domainMode: 'subdomain',
            subdomain: row.subdomain,
            customDomain: '',
            themeId: themes.web.id,
            mobileThemeId: themes.mobile.id,
            comboId: '',
            appName: row.appName,
            appPackage: row.appPackage,
            splashColor: row.primaryColor,
          },
        });
        await onboarding.complete(owner.tenantId);
      }

      const [profile, finished, domain, registeredApp] = await Promise.all([
        profileRepo.findOne({ where: { tenantId: owner.tenantId } }),
        onboardingRepo.findOne({ where: { tenantId: owner.tenantId } }),
        domainRepo.findOne({ where: { tenantId: owner.tenantId } }),
        tenantAppRepo.findOne({ where: { tenantId: owner.tenantId } }),
      ]);
      if (
        profile?.industryId !== row.industryId ||
        finished?.status !== 'complete' ||
        domain?.subdomain !== row.subdomain ||
        registeredApp?.appName !== row.appName ||
        registeredApp?.packageName !== row.appPackage
      ) {
        throw new Error(`Post-registration verification failed for ${row.industry}.`);
      }

      results.push({
        ...row,
        tenantId: owner.tenantId,
        onboardingStatus: finished.status,
        storefrontUrl: `https://${domain.subdomain}.${PLATFORM_DOMAIN}`,
        action,
      });
      console.log(
        `[industry-register] ${results.length}/46 complete | ${row.industry} | ${row.nationalMobile} | ${row.websiteName}`,
      );
    }

    const jewelryProfiles = await profileRepo
      .createQueryBuilder('profile')
      .innerJoin(Industry, 'industry', 'industry.industry_id = profile.industry_id')
      .where('industry.name = :name', { name: EXCLUDED_INDUSTRY })
      .getCount();
    if (jewelryProfiles < 1) {
      throw new Error('Excluded Jewelry / Diamond account disappeared during registration.');
    }

    const reportDir = resolve(process.cwd(), '..', 'exports');
    await fs.mkdir(reportDir, { recursive: true });
    const jsonPath = resolve(reportDir, `${REPORT_BASENAME}.json`);
    const csvPath = resolve(reportDir, `${REPORT_BASENAME}.csv`);
    await fs.writeFile(
      jsonPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          count: results.length,
          excludedIndustry: EXCLUDED_INDUSTRY,
          excludedIndustryProfileCount: jewelryProfiles,
          note: 'Local demo registrations. GST was intentionally skipped; payment fields use synthetic test data.',
          registrations: results,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    await fs.writeFile(csvPath, toCsv(results), 'utf8');
    console.log(`[industry-register] verified=${results.length}, report=${csvPath}`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('[industry-register] failed:', error);
  process.exitCode = 1;
});
