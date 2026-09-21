import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip = require('adm-zip');
import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { In, QueryFailedError, Repository } from 'typeorm';
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
import { Theme, type ThemeChannel } from '../../common/entities/theme.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { ThemeMigrationTelemetryService } from '../../common/observability/theme-migration-telemetry.service';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { QUEUE_NAMES } from '../../workers/queues';
import { AppQueue, createAppQueue } from '../../workers/queue-factory';
import { CreateThemeComboDto } from './dto/create-theme-combo.dto';
import { SelectDistributorThemeDto } from './dto/select-distributor-theme.dto';
import { SelectThemeDto } from './dto/select-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UploadThemeDto } from './dto/upload-theme.dto';
import { UpsertTenantSectionsDto } from './dto/upsert-tenant-sections.dto';
import { UpsertTenantThemeTokensDto } from './dto/upsert-tenant-theme-tokens.dto';
import { summarizeThemeCompatibility } from './theme-compatibility';
import {
  extractAllowedBlocksFromManifestJson,
  extractAllowedSectionsFromManifestJson,
  readAndValidateThemeManifest,
  validateThemeTemplateFiles,
} from './theme-manifest.util';
import {
  getBackendStorageRoot,
  getThemeZipArchiveRoot,
} from '../../common/utils/storage-root';
import { validateThemeZipPackage } from './theme-zip-validator';
import { ThemeArtifactPublisherService } from '../theme-artifacts/theme-artifact-publisher.service';
import { AppConfigService } from '../app-config/app-config.service';

function normalizeStorefrontKey(raw: string | null | undefined): string {
  const k = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return k || 'jewellery';
}

function normalizeLanguageCode(raw: unknown): string {
  const code = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z-]/g, '')
    .slice(0, 16);
  return code || 'en';
}

function uuidOnly(s: string | null | undefined): string | null {
  const t = String(s ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    t,
  )
    ? t
    : null;
}

function isWebChannel(theme: Theme): boolean {
  return (theme.themeChannel ?? 'WEB') === 'WEB';
}

function isMobileChannel(theme: Theme): boolean {
  return theme.themeChannel === 'MOBILE';
}

type StorefrontIndustryPayload = {
  industryId: string | null;
  industryName: string | null;
};

function slugifyThemeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function sanitizeFileStem(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parsePreviewImages(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizePreviewImages(raw: string | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of parsePreviewImages(raw)) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function direntName(name: string | Buffer): string {
  return typeof name === 'string' ? name : name.toString('utf8');
}

/** OS / archiver junk at extract root — must not count toward “single top-level folder” flatten. */
function isJunkFilesystemEntry(name: string | Buffer): boolean {
  const n = direntName(name);
  if (n === '__MACOSX' || n === '.DS_Store' || n === 'Thumbs.db') return true;
  if (n.startsWith('._')) return true;
  return false;
}

/** Finder / macOS adds `__MACOSX` + `._*` AppleDouble files; skip them for validation & delete after extract. */
function isJunkZipEntry(entryName: string): boolean {
  const n = entryName.replace(/\\/g, '/').replace(/^\//u, '');
  if (!n) return true;
  const base = path.posix.basename(n);
  if (base === '.DS_Store' || base.startsWith('._')) return true;
  const segments = n.split('/');
  return segments.some((s) => s === '__MACOSX' || s === '.DS_Store');
}

function safeThemeZipFileName(original: string | undefined): string {
  const base = path
    .basename(original ?? 'theme.zip')
    .replace(/[^\w.\-+()]/g, '_');
  const lower = base.toLowerCase();
  return lower.endsWith('.zip') ? base : `${base}.zip`;
}

function assertZipEntriesSafe(zip: AdmZip, destAbs: string): void {
  const normalizedDest = path.resolve(destAbs) + path.sep;
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const entryName = e.entryName.replace(/\\/g, '/');
    if (isJunkZipEntry(entryName)) continue;
    const segments = entryName.split('/');
    if (segments.some((s) => s === 'node_modules')) {
      throw new BadRequestException('ZIP must not include node_modules paths.');
    }
    if (
      entryName.startsWith('/') ||
      entryName.startsWith('..') ||
      entryName.includes('../')
    ) {
      throw new BadRequestException('ZIP contains unsafe paths.');
    }
    const target = path.resolve(destAbs, entryName);
    if (
      !target.startsWith(normalizedDest) &&
      target !== path.resolve(destAbs)
    ) {
      throw new BadRequestException('ZIP slip attempt blocked.');
    }
  }
}

async function cleanupExtractedThemeJunk(root: string): Promise<void> {
  const mac = path.join(root, '__MACOSX');
  await fs.rm(mac, { recursive: true, force: true }).catch(() => undefined);
  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const nm = direntName(e.name);
      const p = path.join(dir, nm);
      if (e.isFile() && (nm === '.DS_Store' || nm.startsWith('._'))) {
        await fs.unlink(p).catch(() => undefined);
      } else if (e.isDirectory() && nm === '__MACOSX') {
        await fs.rm(p, { recursive: true, force: true }).catch(() => undefined);
      } else if (e.isDirectory()) {
        await walk(p);
      }
    }
  };
  await walk(root);
}

async function flattenSingleRootFolder(extractTo: string): Promise<void> {
  const entries = await fs.readdir(extractTo, { withFileTypes: true });
  const visible = entries.filter((e) => {
    const n = direntName(e.name);
    return !n.startsWith('.') && !isJunkFilesystemEntry(e.name);
  });
  if (visible.length !== 1 || !visible[0].isDirectory()) return;
  const rootDir = path.join(extractTo, direntName(visible[0].name));
  const children = await fs.readdir(rootDir, { withFileTypes: true });
  for (const child of children) {
    await fs.rename(
      path.join(rootDir, direntName(child.name)),
      path.join(extractTo, direntName(child.name)),
    );
  }
  await fs.rm(rootDir, { recursive: true, force: true });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as { driverError?: { code?: string } }).driverError?.code === '23505'
  );
}

/** Join optional CDN origin with a path that starts with `/`. */
function publicStorageUrl(cdnBase: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = cdnBase.replace(/\/$/, '');
  return base ? `${base}${p}` : p;
}

function isPlaceholderPreviewUrl(value: string): boolean {
  return /(?:cdn\.platform\.example|example\.com|placehold\.co)/i.test(value);
}

function normalizeThemePreviewPath(
  value: string | null | undefined,
  storageRelative: string,
): string | null {
  const raw = value?.trim();
  if (!raw || isPlaceholderPreviewUrl(raw)) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  if (raw.startsWith('/storage/')) return raw;
  const rel = raw.replace(/^\.?\//, '').replace(/\\/g, '/');
  if (rel.startsWith('assets/')) {
    return `/storage/${storageRelative.replace(/^\/+|\/+$/g, '')}/${rel}`;
  }
  return raw;
}

function collectImageCandidates(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectImageCandidates(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof child === 'string' &&
      /(image|thumbnail|poster|cover|background|src)/i.test(key) &&
      /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(child)
    ) {
      out.push(child);
    } else {
      collectImageCandidates(child, out);
    }
  }
}

async function findBundledThemePreview(
  extractTo: string,
  storageRelative: string,
  manifest: Record<string, unknown>,
): Promise<string | null> {
  const candidates: string[] = [];
  collectImageCandidates(manifest, candidates);
  const templates = manifest.templates;
  if (templates && typeof templates === 'object' && !Array.isArray(templates)) {
    const home = (templates as Record<string, unknown>).home;
    if (typeof home === 'string' && home.trim()) {
      try {
        const raw = JSON.parse(
          await fs.readFile(path.join(extractTo, home.trim()), 'utf8'),
        ) as unknown;
        collectImageCandidates(raw, candidates);
      } catch {
        // Template validation reports malformed files; preview discovery is best-effort.
      }
    }
  }

  const imageDir = path.join(extractTo, 'assets', 'images');
  try {
    const files = await fs.readdir(imageDir);
    files
      .filter((name) => /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(name))
      .sort((a, b) => {
        const score = (name: string) =>
          /(?:hero|preview|cover|banner|home)/i.test(name) ? 0 : 1;
        return score(a) - score(b) || a.localeCompare(b);
      })
      .forEach((name) => candidates.push(`assets/images/${name}`));
  } catch {
    // Optional folder.
  }

  for (const candidate of candidates) {
    const rel = candidate
      .trim()
      .replace(/^\.?\//, '')
      .replace(/\\/g, '/');
    if (!rel || rel.includes('..') || /^https?:\/\//i.test(rel)) continue;
    try {
      const stat = await fs.stat(path.join(extractTo, rel));
      if (stat.isFile()) {
        return `/storage/${storageRelative.replace(/^\/+|\/+$/g, '')}/${rel}`;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function readJsonFileIfPresent(
  absPath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function flattenLocaleDictionary(
  value: unknown,
  prefix = '',
): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      out[nextKey] = child;
    } else if (child && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(out, flattenLocaleDictionary(child, nextKey));
    }
  }
  return out;
}

@Injectable()
export class ThemesService implements OnModuleDestroy {
  private readonly logger = new Logger(ThemesService.name);
  private readonly buildQueue: AppQueue;
  private readonly publicStorageCdnBase: string;

  constructor(
    @InjectRepository(Theme)
    private readonly themesRepo: Repository<Theme>,
    @InjectRepository(ThemePreviewImage)
    private readonly previewImagesRepo: Repository<ThemePreviewImage>,
    @InjectRepository(ThemeComboMapping)
    private readonly comboRepo: Repository<ThemeComboMapping>,
    @InjectRepository(TenantTheme)
    private readonly tenantThemesRepo: Repository<TenantTheme>,
    @InjectRepository(TenantThemeChange)
    private readonly tenantThemeChangeRepo: Repository<TenantThemeChange>,
    @InjectRepository(TenantThemeSettings)
    private readonly tenantThemeSettingsRepo: Repository<TenantThemeSettings>,
    @InjectRepository(TenantSection)
    private readonly tenantSectionsRepo: Repository<TenantSection>,
    @InjectRepository(TenantThemeToken)
    private readonly tenantThemeTokensRepo: Repository<TenantThemeToken>,
    @InjectRepository(TenantBranding)
    private readonly brandingRepo: Repository<TenantBranding>,
    @InjectRepository(TenantOnboarding)
    private readonly onboardingRepo: Repository<TenantOnboarding>,
    @InjectRepository(TenantProfile)
    private readonly profileRepo: Repository<TenantProfile>,
    @InjectRepository(Industry)
    private readonly industryRepo: Repository<Industry>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    configService: ConfigService,
    private readonly themeTelemetry: ThemeMigrationTelemetryService,
    private readonly artifactPublisher: ThemeArtifactPublisherService,
    private readonly appConfig: AppConfigService,
  ) {
    this.publicStorageCdnBase =
      configService.get<string>('assets.publicStorageCdnUrl') ?? '';
    this.buildQueue = createAppQueue(QUEUE_NAMES.build, configService);
  }

  /**
   * Keep theme selection responsive when Redis/build workers are unavailable.
   * The database selection is authoritative; rebuild delivery is best-effort.
   */
  private enqueueThemeRebuild(input: {
    tenantId: string;
    themeId: string;
    mobileThemeId: string | null;
  }): void {
    this.themeTelemetry.record('theme.deployment.enqueue.requested', {
      tenantId: input.tenantId,
      themeId: input.themeId,
      mobileThemeId: input.mobileThemeId,
    });
    void this.buildQueue
      .add('THEME_SELECTED', {
        ...input,
        trigger: 'APP_REBUILD',
      })
      .then(() => {
        this.themeTelemetry.record('theme.deployment.enqueue.completed', {
          tenantId: input.tenantId,
          themeId: input.themeId,
          mobileThemeId: input.mobileThemeId,
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.themeTelemetry.record('theme.deployment.enqueue.failed', {
          tenantId: input.tenantId,
          themeId: input.themeId,
          mobileThemeId: input.mobileThemeId,
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
        this.logger.warn(
          `Theme saved, but rebuild could not be queued: ${message}`,
        );
      });
  }

  /** Plain objects for JSON responses (avoids TypeORM metadata / circular edge cases on some setups). */
  private manifestPathFromStorage(
    storagePath: string | null | undefined,
  ): string | null {
    const p = storagePath?.trim();
    if (!p) return null;
    const norm = p.replace(/^\/+/, '').replace(/\\/g, '/');
    const rel = `/storage/${norm}/theme.json`;
    return publicStorageUrl(this.publicStorageCdnBase, rel);
  }

  private toPublicTheme(t: Theme): Record<string, unknown> {
    const sp = t.storagePath ?? null;
    return {
      id: t.id,
      slug: t.slug ?? null,
      themeChannel: t.themeChannel ?? 'WEB',
      themeName: t.themeName,
      themeType: t.themeType,
      themeConfigJson: t.themeConfigJson ?? {},
      status: t.status,
      previewImage: t.previewImage ?? null,
      manifestPath: this.manifestPathFromStorage(sp),
      themeVersion: t.themeVersion ?? '1.0',
      createdAt:
        t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    };
  }

  private async findBundledPreviewForTheme(
    theme: Theme,
  ): Promise<string | null> {
    const storageRelative = theme.storagePath
      ?.trim()
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/');
    if (!storageRelative) return null;
    const config = theme.themeConfigJson ?? {};
    const manifest =
      config.manifest &&
      typeof config.manifest === 'object' &&
      !Array.isArray(config.manifest)
        ? (config.manifest as Record<string, unknown>)
        : null;
    if (!manifest) return null;
    const extractTo = path.join(
      getBackendStorageRoot(),
      ...storageRelative.split('/'),
    );
    return findBundledThemePreview(extractTo, storageRelative, manifest);
  }

  private async resolvePublicThemePreviewImage(
    theme: Theme,
    imageUrls: string[] = [],
  ): Promise<string | null> {
    const fromCol = theme.previewImage?.trim();
    if (fromCol && !isPlaceholderPreviewUrl(fromCol)) return fromCol;
    for (const raw of imageUrls) {
      const url = raw.trim();
      if (url && !isPlaceholderPreviewUrl(url)) return url;
    }
    return this.findBundledPreviewForTheme(theme);
  }

  private publicPreviewUrl(value: string | null | undefined): string {
    const raw = value?.trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/storage/'))
      return publicStorageUrl(this.publicStorageCdnBase, raw);
    return raw;
  }

  private async ensureThemesCatalogSchemaCompatibility(): Promise<void> {
    const manager = this.themesRepo.manager;

    await manager.query(`
      CREATE TABLE IF NOT EXISTS "themes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_name" character varying(128) NOT NULL DEFAULT 'Untitled theme',
        "theme_type" character varying(64) NOT NULL DEFAULT 'Generic',
        "theme_config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_themes_id" PRIMARY KEY ("id")
      )
    `);
    await manager.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "theme_name" character varying(128) NOT NULL DEFAULT 'Untitled theme',
      ADD COLUMN IF NOT EXISTS "theme_type" character varying(64) NOT NULL DEFAULT 'Generic',
      ADD COLUMN IF NOT EXISTS "theme_config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "slug" character varying(128) NULL,
      ADD COLUMN IF NOT EXISTS "theme_channel" character varying(16) NOT NULL DEFAULT 'WEB',
      ADD COLUMN IF NOT EXISTS "preview_image" character varying(512) NULL,
      ADD COLUMN IF NOT EXISTS "storage_path" character varying(512) NULL,
      ADD COLUMN IF NOT EXISTS "theme_version" character varying(32) NOT NULL DEFAULT '1.0'
    `);
    await manager.query(`
      UPDATE "themes"
      SET
        "theme_channel" = COALESCE(NULLIF("theme_channel", ''), 'WEB'),
        "theme_config_json" = COALESCE("theme_config_json", '{}'::jsonb),
        "status" = COALESCE(NULLIF("status", ''), 'ACTIVE'),
        "theme_version" = COALESCE(NULLIF("theme_version", ''), '1.0')
    `);
    await manager.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_themes_slug"
      ON "themes" ("slug")
      WHERE "slug" IS NOT NULL
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS "theme_preview_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_preview_images" PRIMARY KEY ("id")
      )
    `);
    await manager.query(`
      ALTER TABLE "theme_preview_images"
      ADD COLUMN IF NOT EXISTS "theme_id" uuid,
      ADD COLUMN IF NOT EXISTS "image_url" text,
      ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_theme_preview_images_theme_id"
      ON "theme_preview_images" ("theme_id")
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS "theme_combo_mapping" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "web_theme_id" uuid NOT NULL,
        "mobile_theme_id" uuid NOT NULL,
        "name" character varying(128) NOT NULL,
        "preview_image" character varying(512) NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_combo_mapping" PRIMARY KEY ("id")
      )
    `);
    await manager.query(`
      ALTER TABLE "theme_combo_mapping"
      ADD COLUMN IF NOT EXISTS "preview_image" character varying(512) NULL,
      ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'ACTIVE'
    `);
  }

  private toPublicComboPack(c: ThemeComboMapping): Record<string, unknown> {
    return {
      id: c.id,
      webThemeId: c.webThemeId,
      mobileThemeId: c.mobileThemeId,
      name: c.name,
      previewImage: c.previewImage,
      status: c.status ?? 'ACTIVE',
      createdAt:
        c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      webTheme: c.webTheme ? this.toPublicTheme(c.webTheme) : undefined,
      mobileTheme: c.mobileTheme
        ? this.toPublicTheme(c.mobileTheme)
        : undefined,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.buildQueue.close();
  }

  async list(user: JwtUserPayload, allStatuses: boolean) {
    await this.ensureThemesCatalogSchemaCompatibility();
    const where =
      allStatuses && user.role === UserRole.SUPER_ADMIN
        ? {}
        : { status: 'ACTIVE' };
    const rows = await this.themesRepo.find({
      where,
      order: { themeChannel: 'ASC', slug: 'ASC', createdAt: 'DESC' },
    });
    const ids = rows.map((r) => r.id);
    const byTheme = new Map<string, string[]>();
    if (ids.length) {
      const images = await this.previewImagesRepo.find({
        where: { themeId: In(ids) },
        order: { sortOrder: 'ASC' },
      });
      for (const img of images) {
        const list = byTheme.get(img.themeId) ?? [];
        list.push(img.imageUrl);
        byTheme.set(img.themeId, list);
      }
    }
    const data = await Promise.all(
      rows.map(async (theme) => {
        const row = this.toPublicTheme(theme);
        const previewImages = (byTheme.get(theme.id) ?? []).filter(
          (url) => !isPlaceholderPreviewUrl(url),
        );
        row.previewImages = previewImages;
        row.previewImage = await this.resolvePublicThemePreviewImage(
          theme,
          previewImages,
        );
        return row;
      }),
    );
    return { success: true, data, meta: {}, message: '' };
  }

  async listComboPacks(user: JwtUserPayload) {
    await this.ensureThemesCatalogSchemaCompatibility();
    const qb = this.comboRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.webTheme', 'w')
      .leftJoinAndSelect('c.mobileTheme', 'm')
      .orderBy('c.name', 'ASC');
    if (user.role !== UserRole.SUPER_ADMIN) {
      qb.andWhere('c.status = :st', { st: 'ACTIVE' });
    }
    const rows = await qb.getMany();
    const data = rows.map((c) => this.toPublicComboPack(c));
    const ids = rows.flatMap((r) => [r.webThemeId, r.mobileThemeId]);
    const byTheme = new Map<string, string[]>();
    if (ids.length) {
      const images = await this.previewImagesRepo.find({
        where: { themeId: In(ids) },
        order: { sortOrder: 'ASC' },
      });
      for (const img of images) {
        const list = byTheme.get(img.themeId) ?? [];
        list.push(img.imageUrl);
        byTheme.set(img.themeId, list);
      }
    }
    for (let i = 0; i < rows.length; i += 1) {
      const source = rows[i];
      const combo = data[i];
      const webImages = source.webTheme
        ? (byTheme.get(source.webTheme.id) ?? []).filter(
            (url) => !isPlaceholderPreviewUrl(url),
          )
        : [];
      const mobileImages = source.mobileTheme
        ? (byTheme.get(source.mobileTheme.id) ?? []).filter(
            (url) => !isPlaceholderPreviewUrl(url),
          )
        : [];
      const web = combo.webTheme as Record<string, unknown> | undefined;
      if (web) web.previewImages = webImages;
      const mobile = combo.mobileTheme as Record<string, unknown> | undefined;
      if (mobile) mobile.previewImages = mobileImages;
      const currentPreview =
        typeof combo.previewImage === 'string' ? combo.previewImage.trim() : '';
      if (!currentPreview || isPlaceholderPreviewUrl(currentPreview)) {
        combo.previewImage =
          (source.webTheme
            ? await this.resolvePublicThemePreviewImage(
                source.webTheme,
                webImages,
              )
            : null) ??
          (source.mobileTheme
            ? await this.resolvePublicThemePreviewImage(
                source.mobileTheme,
                mobileImages,
              )
            : null);
      }
    }
    return { success: true, data, meta: {}, message: '' };
  }

  async uploadThemePackage(
    file: Express.Multer.File | undefined,
    dto: UploadThemeDto,
  ) {
    const startedAt = Date.now();
    this.themeTelemetry.record('theme.release.upload.requested', {
      platform: dto.platform,
      themeName: dto.themeName?.trim() || null,
      requestedSlug: dto.slug?.trim() || null,
      requestedVersion: dto.version?.trim() || null,
      fileProvided: Boolean(file?.buffer?.length),
      fileSizeBytes: file?.size ?? file?.buffer?.length ?? 0,
    });

    try {
      const result = await this.uploadThemePackageLegacy(file, dto);
      const data = (result as { data?: Record<string, unknown> }).data;
      if (
        this.artifactPublisher.isDualPublishEnabled() &&
        typeof data?.id === 'string'
      ) {
        try {
          const uploadedTheme = await this.themesRepo.findOne({
            where: { id: data.id },
          });
          await this.artifactPublisher.publishLegacyTheme({
            legacyThemeId: data.id,
            storagePath: uploadedTheme?.storagePath ?? null,
          });
        } catch (error) {
          this.logger.warn(
            `Theme published to filesystem, but object-storage dual publish failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      this.themeTelemetry.record('theme.release.upload.completed', {
        themeId: typeof data?.id === 'string' ? data.id : null,
        slug: typeof data?.slug === 'string' ? data.slug : null,
        themeChannel:
          typeof data?.themeChannel === 'string' ? data.themeChannel : null,
        themeVersion:
          typeof data?.themeVersion === 'string' ? data.themeVersion : null,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error: unknown) {
      this.themeTelemetry.record('theme.release.upload.failed', {
        platform: dto.platform,
        requestedSlug: dto.slug?.trim() || null,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async uploadThemePackageLegacy(
    file: Express.Multer.File | undefined,
    dto: UploadThemeDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('ZIP file is required (field name: file).');
    }
    const nameLower = (file.originalname ?? '').toLowerCase();
    if (!nameLower.endsWith('.zip')) {
      throw new BadRequestException('Upload must be a .zip archive.');
    }

    const channel: ThemeChannel = dto.platform === 'web' ? 'WEB' : 'MOBILE';
    const subdir = dto.platform === 'web' ? 'web' : 'mobile';
    const slug = dto.slug?.trim()
      ? dto.slug.trim()
      : slugifyThemeName(dto.themeName);
    if (!slug) {
      throw new BadRequestException(
        'Could not derive slug — set slug explicitly.',
      );
    }

    const existingSlug = await this.themesRepo.findOne({ where: { slug } });
    if (existingSlug) {
      throw new BadRequestException(
        `Slug "${slug}" is already used by another theme.`,
      );
    }

    const storageRelative = path.posix.join('themes', subdir, slug);
    const absBase = getBackendStorageRoot();
    const extractTo = path.join(absBase, 'themes', subdir, slug);
    await fs.mkdir(extractTo, { recursive: true });

    let diskExtracted = false;
    let themeRowSaved = false;
    let saved!: Theme;
    const requestedPreviewImages = normalizePreviewImages(
      dto.previewImagesText,
    );
    let previewImages: string[] = [];
    let primaryPreviewImage: string | null = null;
    let zipValidationWarnings: string[] = [];

    try {
      let zip: AdmZip;
      try {
        zip = new AdmZip(file.buffer);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new BadRequestException(`Invalid or corrupted ZIP: ${msg}`);
      }
      assertZipEntriesSafe(zip, extractTo);
      try {
        zip.extractAllTo(extractTo, true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new BadRequestException(`ZIP extraction failed: ${msg}`);
      }
      diskExtracted = true;
      // Junk first so flatten sees only the real single folder (Finder adds sibling __MACOSX).
      await cleanupExtractedThemeJunk(extractTo);
      await flattenSingleRootFolder(extractTo);
      await cleanupExtractedThemeJunk(extractTo);

      const manifest = await readAndValidateThemeManifest(extractTo);
      if (channel === 'WEB') {
        await validateThemeTemplateFiles(extractTo, manifest);
      }
      const zipValidation = await validateThemeZipPackage(extractTo, manifest, {
        channel,
      });
      if (!zipValidation.valid) {
        throw new BadRequestException(
          `Theme ZIP validation failed:\n${zipValidation.errors.map((e) => `- ${e}`).join('\n')}`,
        );
      }
      zipValidationWarnings = zipValidation.warnings;
      const bundledPreview = await findBundledThemePreview(
        extractTo,
        storageRelative,
        manifest as Record<string, unknown>,
      );
      previewImages = requestedPreviewImages
        .map((value) => normalizeThemePreviewPath(value, storageRelative))
        .filter((value): value is string => Boolean(value));
      primaryPreviewImage =
        normalizeThemePreviewPath(dto.previewImage, storageRelative) ??
        previewImages[0] ??
        bundledPreview;
      if (primaryPreviewImage && !previewImages.includes(primaryPreviewImage)) {
        previewImages.unshift(primaryPreviewImage);
      }

      const themeConfigJson: Record<string, unknown> = {
        manifest,
        manifestVersion: manifest.version,
      };
      const sk =
        typeof manifest.storefrontKey === 'string'
          ? normalizeStorefrontKey(manifest.storefrontKey)
          : '';
      if (sk) themeConfigJson.storefrontKey = sk;
      if (dto.description?.trim())
        themeConfigJson.description = dto.description.trim();
      if (dto.demoHost?.trim()) themeConfigJson.demoHost = dto.demoHost.trim();
      if (previewImages.length > 0) {
        themeConfigJson.previewImages = previewImages;
      }
      if (zipValidationWarnings.length > 0) {
        themeConfigJson.zipValidationWarnings = zipValidationWarnings;
      }

      const row = this.themesRepo.create({
        slug,
        themeChannel: channel,
        themeName: dto.themeName.trim(),
        themeType: dto.themeType.trim(),
        themeConfigJson,
        previewImage: primaryPreviewImage,
        status: dto.status ?? 'ACTIVE',
        storagePath: storageRelative.replace(/\\/g, '/'),
        themeVersion: dto.version?.trim() || '1.0',
      });
      try {
        saved = await this.themesRepo.save(row);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new BadRequestException(`Slug "${slug}" is already in use.`);
        }
        throw e;
      }
      themeRowSaved = true;

      if (previewImages.length > 0) {
        const rowsToInsert = previewImages.map((imageUrl, idx) =>
          this.previewImagesRepo.create({
            themeId: saved.id,
            imageUrl,
            sortOrder: idx,
          }),
        );
        await this.previewImagesRepo.save(rowsToInsert);
      }

      const zipArchiveRoot = getThemeZipArchiveRoot();
      const zipDir = path.join(zipArchiveRoot, 'themes', subdir, slug);
      await fs.mkdir(zipDir, { recursive: true });
      await fs.writeFile(
        path.join(zipDir, safeThemeZipFileName(file.originalname)),
        file.buffer,
      );
    } catch (e) {
      if (diskExtracted && !themeRowSaved) {
        await fs
          .rm(extractTo, { recursive: true, force: true })
          .catch(() => undefined);
      }
      throw e;
    }
    return {
      success: true,
      data: { ...this.toPublicTheme(saved), previewImages },
      meta: {
        storageAbs: extractTo,
        ...(zipValidationWarnings.length
          ? { zipValidationWarnings: zipValidationWarnings }
          : {}),
      },
      message:
        'Theme validated, preview detected, and package published to runtime storage.',
    };
  }

  async updateThemeMetadata(themeId: string, dto: UpdateThemeDto) {
    const theme = await this.themesRepo.findOne({ where: { id: themeId } });
    if (!theme) {
      throw new BadRequestException('Theme not found.');
    }

    const storageRelative = theme.storagePath?.trim() ?? '';
    if (dto.themeName !== undefined) theme.themeName = dto.themeName.trim();
    if (dto.themeType !== undefined) theme.themeType = dto.themeType.trim();
    if (dto.version !== undefined)
      theme.themeVersion = dto.version.trim() || '1.0';
    if (dto.status !== undefined) theme.status = dto.status;

    const config = { ...(theme.themeConfigJson ?? {}) };
    if (dto.description !== undefined) {
      const value = dto.description.trim();
      if (value) config.description = value;
      else delete config.description;
    }
    if (dto.demoHost !== undefined) {
      const value = dto.demoHost.trim();
      if (value) config.demoHost = value;
      else delete config.demoHost;
    }

    let previewImages: string[] | null = null;
    if (dto.previewImagesText !== undefined) {
      previewImages = normalizePreviewImages(dto.previewImagesText)
        .map((value) => normalizeThemePreviewPath(value, storageRelative))
        .filter((value): value is string => Boolean(value));
      if (previewImages.length) config.previewImages = previewImages;
      else delete config.previewImages;
    }
    if (dto.previewImage !== undefined) {
      theme.previewImage = normalizeThemePreviewPath(
        dto.previewImage,
        storageRelative,
      );
    }
    if (!theme.previewImage && previewImages?.length) {
      theme.previewImage = previewImages[0];
    }
    if (!theme.previewImage) {
      const bundledPreview = await this.findBundledPreviewForTheme(theme);
      if (bundledPreview) {
        theme.previewImage = bundledPreview;
        if (previewImages !== null && !previewImages.includes(bundledPreview)) {
          previewImages.unshift(bundledPreview);
          config.previewImages = previewImages;
        }
      }
    }

    theme.themeConfigJson = config;
    const saved = await this.themesRepo.save(theme);

    if (previewImages !== null) {
      await this.previewImagesRepo.delete({ themeId });
      if (previewImages.length) {
        await this.previewImagesRepo.save(
          previewImages.map((imageUrl, sortOrder) =>
            this.previewImagesRepo.create({ themeId, imageUrl, sortOrder }),
          ),
        );
      }
    } else {
      const existing = await this.previewImagesRepo.find({
        where: { themeId },
        order: { sortOrder: 'ASC' },
      });
      previewImages = existing.map((row) => row.imageUrl);
    }

    return {
      success: true,
      data: { ...this.toPublicTheme(saved), previewImages },
      meta: {},
      message: 'Theme metadata updated.',
    };
  }

  async createComboPack(dto: CreateThemeComboDto) {
    await this.assertWebMobilePair(dto.webThemeId, dto.mobileThemeId);
    const row = this.comboRepo.create({
      name: dto.name.trim(),
      webThemeId: dto.webThemeId,
      mobileThemeId: dto.mobileThemeId,
      previewImage: dto.previewImage?.trim() ?? null,
      status: dto.status ?? 'ACTIVE',
    });
    try {
      const saved = await this.comboRepo.save(row);
      const full = await this.comboRepo.findOne({
        where: { id: saved.id },
        relations: ['webTheme', 'mobileTheme'],
      });
      return {
        success: true,
        data: this.toPublicComboPack(full!),
        meta: {},
        message: 'Theme combo created.',
      };
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new BadRequestException(
          'This web + mobile theme pair is already mapped to a combo.',
        );
      }
      throw e;
    }
  }

  private storefrontKeyFromTheme(theme: Theme): string {
    const cfg = theme.themeConfigJson as Record<string, unknown> | null;
    const rawCfgKey =
      typeof cfg?.storefrontKey === 'string' ? cfg.storefrontKey : '';
    if (rawCfgKey) return normalizeStorefrontKey(rawCfgKey);
    if (theme.slug) return normalizeStorefrontKey(theme.slug);
    if (theme.themeType) return normalizeStorefrontKey(theme.themeType);
    return 'jewellery';
  }

  /** Distributor dashboard: current row in `tenant_themes` (may be null before first selection). */
  async tenantCurrent(user: JwtUserPayload) {
    const tenantId = user.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant context required.');
    const row = await this.tenantThemesRepo.findOne({
      where: { tenantId },
      relations: ['theme'],
    });
    const settings = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
      relations: ['webTheme', 'mobileTheme', 'combo'],
    });
    const webTheme = settings?.webTheme ?? row?.theme ?? null;
    const mobileTheme = settings?.mobileTheme ?? null;
    const publicWebTheme = webTheme
      ? {
          ...this.toPublicTheme(webTheme),
          previewImage: await this.resolvePublicThemePreviewImage(webTheme),
        }
      : null;
    const publicMobileTheme = mobileTheme
      ? {
          ...this.toPublicTheme(mobileTheme),
          previewImage: await this.resolvePublicThemePreviewImage(mobileTheme),
        }
      : null;
    return {
      success: true,
      data: {
        ...(row ?? {}),
        theme: publicWebTheme,
        webTheme: publicWebTheme,
        mobileTheme: publicMobileTheme,
        comboId: settings?.comboId ?? null,
        combo: settings?.combo ?? null,
      },
      meta: {},
      message: '',
    };
  }

  /**
   * WEB storefront theme for a tenant — same precedence as `storefrontCurrent` (`web_theme_id` → `tenant_themes` → branding).
   */
  private async resolveTenantWebThemeEntity(
    tenantId: string,
  ): Promise<{ theme: Theme | null; tts: TenantThemeSettings | null }> {
    const tts = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
      relations: ['webTheme'],
    });
    if (tts?.webTheme && isWebChannel(tts.webTheme)) {
      return { theme: tts.webTheme, tts };
    }
    const row = await this.tenantThemesRepo.findOne({
      where: { tenantId },
      relations: ['theme'],
    });
    if (row?.theme && isWebChannel(row.theme)) {
      return { theme: row.theme, tts };
    }
    const brand = await this.brandingRepo.findOne({ where: { tenantId } });
    const bid = uuidOnly(brand?.themeId ?? null);
    if (bid) {
      const theme = await this.themesRepo.findOne({
        where: { id: bid, status: 'ACTIVE' },
      });
      if (theme && isWebChannel(theme)) {
        return { theme, tts };
      }
    }
    return { theme: null, tts };
  }

  private async readThemeJsonManifestForTheme(
    theme: Theme,
  ): Promise<Record<string, unknown> | null> {
    const sp = theme.storagePath?.trim();
    if (!sp) return null;
    const abs = path.join(
      getBackendStorageRoot(),
      sp.replace(/^\/+/, ''),
      'theme.json',
    );
    const tryParse = (parsed: unknown): Record<string, unknown> | null => {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return null;
      return parsed as Record<string, unknown>;
    };
    try {
      const raw = await fs.readFile(abs, 'utf8');
      return tryParse(JSON.parse(raw) as unknown);
    } catch {
      const url = this.manifestPathFromStorage(sp);
      if (url && /^https?:\/\//i.test(url)) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        try {
          const res = await fetch(url, { signal: ac.signal });
          if (!res.ok) return null;
          return tryParse(await res.json());
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      }
      return null;
    }
  }

  /** Website builder: theme identity + manifest allow-lists for section picker filtering. */
  async websiteBuilderThemeInfo(user: JwtUserPayload) {
    const tenantId = user.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant context required.');
    const { theme } = await this.resolveTenantWebThemeEntity(tenantId);
    if (!theme) {
      return {
        success: true,
        data: {
          theme: null,
          theme_id: null,
          slug: null,
          version: null,
          manifest_version: null,
          storefront_key: 'jewellery',
          manifest_path: null,
          allowed_sections: null,
          allowed_blocks: null,
          templates: {},
          component_schemas: {},
          asset_base_url: null,
          theme_engine: 'registry-v1' as const,
          compatibility: summarizeThemeCompatibility(null, {
            hasStoragePath: false,
          }),
        },
        meta: {},
        message: '',
      };
    }
    const manifest = await this.readThemeJsonManifestForTheme(theme);
    const editorBundle = await this.buildThemeEditorBundle(theme, manifest);
    const allowedSections = extractAllowedSectionsFromManifestJson(manifest);
    const allowedBlocks = extractAllowedBlocksFromManifestJson(manifest);
    const manifestVersion =
      manifest && typeof manifest.version === 'string'
        ? manifest.version.trim()
        : null;
    const themeDisplayName =
      manifest && typeof manifest.name === 'string' && manifest.name.trim()
        ? manifest.name.trim()
        : theme.themeName;
    return {
      success: true,
      data: {
        theme: themeDisplayName,
        theme_id: theme.id,
        slug: theme.slug ?? null,
        version: theme.themeVersion ?? '1.0',
        manifest_version: manifestVersion,
        storefront_key: this.storefrontKeyFromTheme(theme),
        manifest_path: this.manifestPathFromStorage(theme.storagePath),
        allowed_sections: allowedSections,
        allowed_blocks: allowedBlocks,
        templates: editorBundle.templates,
        component_schemas: editorBundle.componentSchemas,
        asset_base_url: editorBundle.assetBaseUrl,
        theme_engine: 'registry-v1' as const,
        compatibility: summarizeThemeCompatibility(manifest, {
          hasStoragePath: Boolean(theme.storagePath?.trim()),
        }),
      },
      meta: {},
      message: '',
    };
  }

  private async buildThemeEditorBundle(
    theme: Theme,
    manifest: Record<string, unknown> | null,
  ): Promise<{
    templates: Record<string, unknown>;
    componentSchemas: Record<string, unknown>;
    assetBaseUrl: string | null;
  }> {
    const storageRelative =
      theme.storagePath
        ?.trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\\/g, '/') ?? '';
    if (!storageRelative || storageRelative.includes('..')) {
      return { templates: {}, componentSchemas: {}, assetBaseUrl: null };
    }
    const extractTo = path.join(
      getBackendStorageRoot(),
      ...storageRelative.split('/'),
    );
    const manifestObject = manifest ?? {};
    const templateRefs =
      manifestObject.templates &&
      typeof manifestObject.templates === 'object' &&
      !Array.isArray(manifestObject.templates)
        ? (manifestObject.templates as Record<string, unknown>)
        : {};
    const componentRefs =
      manifestObject.components &&
      typeof manifestObject.components === 'object' &&
      !Array.isArray(manifestObject.components)
        ? (manifestObject.components as Record<string, unknown>)
        : {};
    const templates: Record<string, unknown> = {};
    const componentSchemas: Record<string, unknown> = {};
    await Promise.all(
      Object.entries(templateRefs).map(async ([page, rel]) => {
        if (typeof rel !== 'string' || !rel.trim() || rel.includes('..'))
          return;
        const value = await readJsonFileIfPresent(path.join(extractTo, rel));
        if (value) templates[page] = value;
      }),
    );
    await Promise.all(
      Object.entries(componentRefs).map(async ([key, rel]) => {
        if (typeof rel !== 'string' || !rel.trim() || rel.includes('..'))
          return;
        const value = await readJsonFileIfPresent(path.join(extractTo, rel));
        if (value) componentSchemas[key] = value;
      }),
    );
    return {
      templates,
      componentSchemas,
      assetBaseUrl: publicStorageUrl(
        this.publicStorageCdnBase,
        `/storage/${storageRelative}`,
      ),
    };
  }

  private resolveTenantIdForEdit(
    user: JwtUserPayload,
    tenantId?: string,
  ): string {
    const target = (tenantId ?? user.tenantId ?? '').trim();
    if (!target) throw new BadRequestException('tenantId is required.');
    const isSuper =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT;
    if (!isSuper && target !== user.tenantId) {
      throw new ForbiddenException(
        'You can only edit your own tenant website settings.',
      );
    }
    return target;
  }

  async getTenantSections(
    user: JwtUserPayload,
    page: string,
    tenantId?: string,
  ) {
    const targetTenantId = this.resolveTenantIdForEdit(user, tenantId);
    const p = (page ?? '').trim().toLowerCase();
    if (!p) throw new BadRequestException('page is required.');
    const rows = await this.tenantSectionsRepo.find({
      where: { tenantId: targetTenantId, page: p },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
    return {
      success: true,
      data: {
        tenantId: targetTenantId,
        page: p,
        sections: rows.map((r) => ({
          sectionKey: r.sectionKey,
          settings: r.settingsJson ?? {},
          orderIndex: r.orderIndex,
          enabled: r.enabled,
        })),
      },
      meta: {},
      message: '',
    };
  }

  async upsertTenantSections(
    user: JwtUserPayload,
    dto: UpsertTenantSectionsDto,
  ) {
    const targetTenantId = this.resolveTenantIdForEdit(user, dto.tenantId);
    const page = dto.page.trim().toLowerCase();
    const sanitized = dto.sections.map((s, idx) => ({
      sectionKey: s.sectionKey.trim(),
      settingsJson: s.settings ?? {},
      orderIndex: typeof s.orderIndex === 'number' ? s.orderIndex : idx,
      enabled: s.enabled !== false,
    }));

    await this.tenantSectionsRepo.delete({ tenantId: targetTenantId, page });
    if (sanitized.length > 0) {
      await this.tenantSectionsRepo.save(
        sanitized.map((s) =>
          this.tenantSectionsRepo.create({
            tenantId: targetTenantId,
            page,
            sectionKey: s.sectionKey,
            settingsJson: s.settingsJson,
            orderIndex: s.orderIndex,
            enabled: s.enabled,
          }),
        ),
      );
    }
    return this.getTenantSections(user, page, targetTenantId);
  }

  async getTenantThemeTokens(user: JwtUserPayload, tenantId?: string) {
    const targetTenantId = this.resolveTenantIdForEdit(user, tenantId);
    const row = await this.tenantThemeTokensRepo.findOne({
      where: { tenantId: targetTenantId },
    });
    return {
      success: true,
      data: {
        tenantId: targetTenantId,
        tokens: row?.tokensJson ?? {},
      },
      meta: {},
      message: '',
    };
  }

  async upsertTenantThemeTokens(
    user: JwtUserPayload,
    dto: UpsertTenantThemeTokensDto,
  ) {
    const targetTenantId = this.resolveTenantIdForEdit(user, dto.tenantId);
    const existing = await this.tenantThemeTokensRepo.findOne({
      where: { tenantId: targetTenantId },
    });
    if (!existing) {
      await this.tenantThemeTokensRepo.save(
        this.tenantThemeTokensRepo.create({
          tenantId: targetTenantId,
          tokensJson: dto.tokens ?? {},
        }),
      );
    } else {
      existing.tokensJson = dto.tokens ?? {};
      await this.tenantThemeTokensRepo.save(existing);
    }
    return this.getTenantThemeTokens(user, targetTenantId);
  }

  async uploadTenantMedia(
    user: JwtUserPayload,
    file: Express.Multer.File | undefined,
  ) {
    const tenantId = this.resolveTenantIdForEdit(user, undefined);
    if (!file) throw new BadRequestException('file is required.');
    const mime = (file.mimetype ?? '').toLowerCase();
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ]);
    if (!allowed.has(mime)) {
      throw new BadRequestException(
        'Only image files are allowed (jpeg/png/webp/gif/svg).',
      );
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    const extFromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    const ext = extFromName || extFromMime[mime] || '.bin';
    const base =
      sanitizeFileStem(path.basename(file.originalname || 'image', ext)) ||
      'image';
    const fileName = `${Date.now()}-${base}${ext}`;
    const relDir = path.posix.join('tenant-media', tenantId);
    const absDir = path.join(getBackendStorageRoot(), relDir);
    await fs.mkdir(absDir, { recursive: true });
    const absPath = path.join(absDir, fileName);
    await fs.writeFile(absPath, file.buffer);
    return {
      success: true,
      data: {
        url: `/storage/${relDir}/${fileName}`,
        path: `${relDir}/${fileName}`,
        fileName,
      },
      meta: {},
      message: '',
    };
  }

  async uploadThemePreviewMedia(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('file is required.');
    const mime = (file.mimetype ?? '').toLowerCase();
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ]);
    if (!allowed.has(mime)) {
      throw new BadRequestException(
        'Only image files are allowed (jpeg/png/webp/gif/svg).',
      );
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    const extFromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    const ext = extFromName || extFromMime[mime] || '.bin';
    const base =
      sanitizeFileStem(
        path.basename(file.originalname || 'theme-preview', ext),
      ) || 'theme-preview';
    const fileName = `${Date.now()}-${base}${ext}`;
    const relDir = 'theme-preview';
    const absDir = path.join(getBackendStorageRoot(), relDir);
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(path.join(absDir, fileName), file.buffer);
    return {
      success: true,
      data: {
        url: `/storage/${relDir}/${fileName}`,
        path: `${relDir}/${fileName}`,
        fileName,
      },
      meta: {},
      message: '',
    };
  }

  /**
   * Storefront UI key: `tenant_theme_settings.web_theme_id` first, then `tenant_themes`, then branding UUID.
   * Also returns web theme metadata + manifest path for runtime theme.json fetch (CDN / `/storage/...`).
   */
  async storefrontCurrent(tenantId: string | null): Promise<{
    success: boolean;
    data: {
      storefrontKey: string;
      themeEngine: 'registry-v1';
      contentOverrides: {
        pages: Record<
          string,
          {
            sections: Array<{
              sectionKey: string;
              settings?: Record<string, unknown>;
              enabled?: boolean;
              orderIndex?: number;
            }>;
          }
        >;
      };
      tokenOverrides: Record<string, unknown>;
      webTheme: null | {
        id: string;
        slug: string | null;
        themeName: string;
        manifestPath: string | null;
      };
      /** `tenant_branding` — storefront header / UI (no secrets). */
      branding: {
        logoUrl: string | null;
        logoDataUrl: string | null;
        tagline: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        industryId: string | null;
        industryName: string | null;
      };
    };
    meta: Record<string, never>;
    message: string;
  }> {
    const emptyWeb = (): null => null;

    const pack = (
      theme: Theme | null | undefined,
      tts?: TenantThemeSettings | null,
    ): {
      storefrontKey: string;
      themeEngine: 'registry-v1';
      contentOverrides: {
        pages: Record<
          string,
          {
            sections: Array<{
              sectionKey: string;
              settings?: Record<string, unknown>;
              enabled?: boolean;
              orderIndex?: number;
            }>;
          }
        >;
      };
      tokenOverrides: Record<string, unknown>;
      webTheme: null | {
        id: string;
        slug: string | null;
        themeName: string;
        manifestPath: string | null;
      };
      branding: {
        logoUrl: string | null;
        logoDataUrl: string | null;
        tagline: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        industryId: string | null;
        industryName: string | null;
      };
    } => {
      const emptyBranding = (): {
        logoUrl: null;
        logoDataUrl: null;
        tagline: null;
        primaryColor: null;
        secondaryColor: null;
        industryId: null;
        industryName: null;
      } => ({
        logoUrl: null,
        logoDataUrl: null,
        tagline: null,
        primaryColor: null,
        secondaryColor: null,
        industryId: null,
        industryName: null,
      });
      if (!theme || !isWebChannel(theme)) {
        return {
          storefrontKey: 'jewellery',
          themeEngine: 'registry-v1',
          contentOverrides: { pages: {} },
          tokenOverrides: {},
          webTheme: emptyWeb(),
          branding: emptyBranding(),
        };
      }
      const tokenOverrides: Record<string, unknown> = {};
      if (tts?.primaryColor) tokenOverrides.colorPrimary = tts.primaryColor;
      const contentOverrides = {
        pages: {} as Record<
          string,
          {
            sections: Array<{
              sectionKey: string;
              settings?: Record<string, unknown>;
              enabled?: boolean;
              orderIndex?: number;
            }>;
          }
        >,
      };
      const sp = theme.storagePath ?? null;
      return {
        storefrontKey: this.storefrontKeyFromTheme(theme),
        themeEngine: 'registry-v1',
        contentOverrides,
        tokenOverrides,
        webTheme: {
          id: theme.id,
          slug: theme.slug ?? null,
          themeName: theme.themeName,
          manifestPath: this.manifestPathFromStorage(sp),
        },
        branding: emptyBranding(),
      };
    };

    const emptyBrandingOut = () => ({
      logoUrl: null as string | null,
      logoDataUrl: null as string | null,
      tagline: null as string | null,
      primaryColor: null as string | null,
      secondaryColor: null as string | null,
      industryId: null as string | null,
      industryName: null as string | null,
    });

    if (!tenantId) {
      const base = pack(null, null);
      return {
        success: true,
        data: { ...base, branding: emptyBrandingOut() },
        meta: {},
        message: '',
      };
    }
    const [tts, sections, tokens, brandingRow, industryOut, onboardingRow] =
      await Promise.all([
        this.tenantThemeSettingsRepo.findOne({
          where: { tenantId },
          relations: ['webTheme'],
        }),
        this.tenantSectionsRepo.find({
          where: { tenantId },
          order: { page: 'ASC', orderIndex: 'ASC', createdAt: 'ASC' },
        }),
        this.tenantThemeTokensRepo.findOne({ where: { tenantId } }),
        this.brandingRepo.findOne({ where: { tenantId } }),
        this.resolveTenantIndustry(tenantId),
        this.onboardingRepo.findOne({ where: { tenantId } }),
      ]);
    // AppConfigService is the single language authority shared with Distributor Settings.
    // Do not resolve this independently here: a stale onboarding payload must never
    // override the persisted app-config language sent to the storefront.
    const selectedLanguageCode = normalizeLanguageCode(
      (await this.appConfig.getForTenant(tenantId)).selectedLanguageCode ??
        onboardingRow?.payloadJson?.['selectedLanguageCode'],
    );
    const brandingOut = {
      logoUrl: brandingRow?.logoUrl ?? null,
      logoDataUrl: brandingRow?.logoDataUrl ?? null,
      tagline: brandingRow?.tagline ?? null,
      primaryColor: brandingRow?.primaryColor ?? null,
      secondaryColor: brandingRow?.secondaryColor ?? null,
      ...industryOut,
    };
    const groupedPages: Record<
      string,
      {
        sections: Array<{
          sectionKey: string;
          settings?: Record<string, unknown>;
          enabled?: boolean;
          orderIndex?: number;
        }>;
      }
    > = {};
    for (const row of sections) {
      const rawPage =
        row.page != null && String(row.page).trim() !== ''
          ? String(row.page).trim()
          : 'home';
      const p = rawPage.toLowerCase();
      groupedPages[p] ??= { sections: [] };
      groupedPages[p].sections.push({
        sectionKey: row.sectionKey,
        settings: row.settingsJson ?? {},
        orderIndex: row.orderIndex,
        enabled: row.enabled,
      });
    }
    const tokenOverrides = tokens?.tokensJson ?? {};
    if (
      tts?.primaryColor &&
      typeof tokenOverrides['colorPrimary'] !== 'string'
    ) {
      tokenOverrides['colorPrimary'] = tts.primaryColor;
    }
    if (
      tts?.secondaryColor &&
      typeof tokenOverrides['colorSecondary'] !== 'string'
    ) {
      tokenOverrides['colorSecondary'] = tts.secondaryColor;
    }
    if (
      brandingRow?.primaryColor &&
      typeof tokenOverrides['colorPrimary'] !== 'string'
    ) {
      tokenOverrides['colorPrimary'] = brandingRow.primaryColor;
    }
    if (
      brandingRow?.secondaryColor &&
      typeof tokenOverrides['colorSecondary'] !== 'string'
    ) {
      tokenOverrides['colorSecondary'] = brandingRow.secondaryColor;
    }
    if (tts?.webTheme) {
      const data = pack(tts.webTheme, tts);
      (
        data as typeof data & { selectedLanguageCode: string }
      ).selectedLanguageCode = selectedLanguageCode;
      data.contentOverrides.pages = groupedPages;
      data.tokenOverrides = tokenOverrides;
      data.branding = brandingOut;
      return { success: true, data, meta: {}, message: '' };
    }
    const row = await this.tenantThemesRepo.findOne({
      where: { tenantId },
      relations: ['theme'],
    });
    if (row?.theme) {
      const data = pack(row.theme, tts);
      (
        data as typeof data & { selectedLanguageCode: string }
      ).selectedLanguageCode = selectedLanguageCode;
      data.contentOverrides.pages = groupedPages;
      data.tokenOverrides = tokenOverrides;
      data.branding = brandingOut;
      return { success: true, data, meta: {}, message: '' };
    }
    const bid = uuidOnly(brandingRow?.themeId ?? null);
    if (bid) {
      const theme = await this.themesRepo.findOne({
        where: { id: bid, status: 'ACTIVE' },
      });
      if (theme) {
        const data = pack(theme, tts);
        (
          data as typeof data & { selectedLanguageCode: string }
        ).selectedLanguageCode = selectedLanguageCode;
        data.contentOverrides.pages = groupedPages;
        data.tokenOverrides = tokenOverrides;
        data.branding = brandingOut;
        return { success: true, data, meta: {}, message: '' };
      }
    }
    const data = pack(null, tts);
    (
      data as typeof data & { selectedLanguageCode: string }
    ).selectedLanguageCode = selectedLanguageCode;
    data.contentOverrides.pages = groupedPages;
    data.tokenOverrides = tokenOverrides;
    data.branding = brandingOut;
    return { success: true, data, meta: {}, message: '' };
  }

  /**
   * Public storefront (mobile): `{ base_layout, config, branding }` — tenant from middleware.
   * Precedence: `tenant_theme_settings.mobile_theme_id` → combo mobile for web → `tenant_themes` if MOBILE → branding theme if MOBILE; config merges web JSON then mobile JSON; branding from tokens / TTS / `tenant_branding`.
   */
  async storefrontMobileTheme(
    tenantId: string,
    previewLanguageCode?: string | null,
  ): Promise<{
    success: true;
    data: {
      theme_id: string | null;
      theme_slug: string | null;
      theme_name: string | null;
      base_layout: string;
      config: Record<string, unknown>;
      branding: Record<string, unknown>;
      preview: Record<string, unknown> | null;
    };
    meta: Record<string, never>;
    message: string;
  }> {
    const { mobileTheme, webTheme, tts, branding } =
      await this.resolveTenantMobileThemeAndWeb(tenantId);
    const [tokensRow, sections, industry] = await Promise.all([
      this.tenantThemeTokensRepo.findOne({ where: { tenantId } }),
      this.tenantSectionsRepo.find({
        where: { tenantId, page: 'home' },
        order: { orderIndex: 'ASC', createdAt: 'ASC' },
      }),
      this.resolveTenantIndustry(tenantId),
    ]);
    const tokens = tokensRow?.tokensJson ?? {};
    const appConfigLanguage = (await this.appConfig.getForTenant(tenantId))
      .selectedLanguageCode;
    const selectedLanguageCode = normalizeLanguageCode(
      previewLanguageCode?.trim() || appConfigLanguage,
    );
    const preview = await this.buildMobileThemePreviewBundle(
      mobileTheme,
      selectedLanguageCode,
    );
    this.applyTenantSectionsToMobilePreview(preview, sections);
    const selectedThemeTokens =
      preview?.['tokens'] &&
      typeof preview['tokens'] === 'object' &&
      !Array.isArray(preview['tokens'])
        ? (preview['tokens'] as Record<string, unknown>)
        : {};
    const data = {
      ...this.composeMobileThemeBundle({
        mobileTheme,
        webTheme,
        tts,
        branding,
        tokens,
        selectedThemeTokens,
        industry,
      }),
      preview,
    };
    return { success: true, data, meta: {}, message: '' };
  }

  private applyTenantSectionsToMobilePreview(
    preview: Record<string, unknown> | null,
    sections: TenantSection[],
  ): void {
    if (!preview || !sections.length) return;
    const homeTemplate = preview['homeTemplate'];
    if (
      !homeTemplate ||
      typeof homeTemplate !== 'object' ||
      Array.isArray(homeTemplate)
    )
      return;
    const template = homeTemplate as Record<string, unknown>;
    const rawSections = Array.isArray(template['sections'])
      ? template['sections']
      : [];
    const normalized = rawSections
      .filter(
        (section): section is Record<string, unknown> =>
          Boolean(section) &&
          typeof section === 'object' &&
          !Array.isArray(section),
      )
      .map((section, idx) => {
        const key = String(
          section['id'] ?? section['type'] ?? section['component'] ?? '',
        )
          .trim()
          .toLowerCase();
        const row = sections.find(
          (s) => s.sectionKey.trim().toLowerCase() === key,
        );
        return {
          section: row
            ? {
                ...section,
                settings: {
                  ...((section['settings'] as
                    | Record<string, unknown>
                    | undefined) ?? {}),
                  ...(row.settingsJson ?? {}),
                },
              }
            : section,
          orderIndex: row?.orderIndex ?? idx,
          enabled: row?.enabled !== false,
          key,
        };
      })
      .filter((x) => x.enabled);
    const existing = new Set(normalized.map((x) => x.key).filter(Boolean));
    for (const row of sections) {
      const key = row.sectionKey.trim();
      const lower = key.toLowerCase();
      if (!key || existing.has(lower) || row.enabled === false) continue;
      normalized.push({
        section: { id: key, type: key, settings: row.settingsJson ?? {} },
        orderIndex: row.orderIndex,
        enabled: true,
        key: lower,
      });
    }
    template['sections'] = normalized
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((x) => x.section);
  }

  private async buildMobileThemePreviewBundle(
    theme: Theme | null,
    languageCode = 'en',
  ): Promise<Record<string, unknown> | null> {
    if (!theme?.storagePath?.trim()) return null;
    const storageRelative = theme.storagePath
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/');
    if (!storageRelative || storageRelative.includes('..')) return null;
    const extractTo = path.join(
      getBackendStorageRoot(),
      ...storageRelative.split('/'),
    );
    const manifest =
      ((theme.themeConfigJson as Record<string, unknown> | null | undefined)
        ?.manifest as Record<string, unknown> | undefined) ??
      (await readJsonFileIfPresent(path.join(extractTo, 'theme.json'))) ??
      {};
    const templates =
      manifest.templates &&
      typeof manifest.templates === 'object' &&
      !Array.isArray(manifest.templates)
        ? (manifest.templates as Record<string, unknown>)
        : {};
    const tokens =
      manifest.tokens &&
      typeof manifest.tokens === 'object' &&
      !Array.isArray(manifest.tokens)
        ? (manifest.tokens as Record<string, unknown>)
        : {};
    const homePath =
      typeof templates.home === 'string' && templates.home.trim()
        ? templates.home.trim()
        : 'templates/home.json';

    const localePath = path.join(
      extractTo,
      'locales',
      `${normalizeLanguageCode(languageCode)}.json`,
    );
    const fallbackLocalePath = path.join(extractTo, 'locales', 'en.json');
    const [homeTemplate, colors, typography, layout, spacing, locale, fallbackLocale] =
      await Promise.all([
        readJsonFileIfPresent(path.join(extractTo, homePath)),
        typeof tokens.colors === 'string'
          ? readJsonFileIfPresent(path.join(extractTo, tokens.colors))
          : Promise.resolve(null),
        typeof tokens.typography === 'string'
          ? readJsonFileIfPresent(path.join(extractTo, tokens.typography))
          : Promise.resolve(null),
        typeof tokens.layout === 'string'
          ? readJsonFileIfPresent(path.join(extractTo, tokens.layout))
          : Promise.resolve(null),
        typeof tokens.spacing === 'string'
          ? readJsonFileIfPresent(path.join(extractTo, tokens.spacing))
          : Promise.resolve(null),
        readJsonFileIfPresent(localePath),
        normalizeLanguageCode(languageCode) === 'en'
          ? Promise.resolve(null)
          : readJsonFileIfPresent(fallbackLocalePath),
      ]);
    const localeDictionary = {
      ...flattenLocaleDictionary(fallbackLocale),
      ...flattenLocaleDictionary(locale),
    };

    return {
      themeName: theme.themeName,
      slug: theme.slug,
      assetBaseUrl: publicStorageUrl(
        this.publicStorageCdnBase,
        `/storage/${storageRelative}`,
      ),
      homeTemplate,
      languageCode: normalizeLanguageCode(languageCode),
      locale: localeDictionary,
      tokens: {
        colors: colors ?? {},
        typography: typography ?? {},
        layout: layout ?? {},
        spacing: spacing ?? {},
      },
    };
  }

  /**
   * `POST distributor/themes/select` — exactly one of:
   * - `theme_id`: WEB → full `select`; MOBILE → `selectMobileTheme`
   * - `combo_id` → `select` with combo pack
   */
  async selectByThemeIdBody(
    user: JwtUserPayload,
    dto: SelectDistributorThemeDto,
  ) {
    const tenantOverride = dto.tenant_id?.trim();
    const comboRaw = dto.combo_id?.trim();
    const themeRaw = dto.theme_id?.trim();
    const hasCombo = !!comboRaw;
    const hasTheme = !!themeRaw;
    if (hasCombo === hasTheme) {
      throw new BadRequestException(
        'Provide exactly one of: theme_id (WEB or MOBILE theme UUID), or combo_id (web+mobile combo pack UUID).',
      );
    }
    if (hasCombo) {
      return this.select(user, {
        comboId: comboRaw!,
        tenantId: tenantOverride,
      });
    }
    const theme = await this.themesRepo.findOne({
      where: { id: themeRaw!, status: 'ACTIVE' },
    });
    if (!theme) throw new BadRequestException('Theme not found or inactive.');
    if (isMobileChannel(theme)) {
      return this.selectMobileTheme(user, themeRaw!, tenantOverride);
    }
    return this.select(user, { themeId: themeRaw!, tenantId: tenantOverride });
  }

  /** Distributor theme gallery — snake_case keys for storefront/mobile clients. */
  async listDistributorThemeGallery(channel: 'WEB' | 'MOBILE'): Promise<{
    success: true;
    data: Array<{
      id: string;
      theme_name: string;
      preview_image: string;
      base_layout: string;
      theme_family: string;
      version: string;
      storefront_key: string;
    }>;
    meta: Record<string, never>;
    message: string;
  }> {
    const rows = await this.themesRepo.find({
      where: { status: 'ACTIVE', themeChannel: channel },
      order: { themeName: 'ASC', slug: 'ASC' },
    });
    const ids = rows.map((r) => r.id);
    const byTheme = new Map<string, string[]>();
    if (ids.length) {
      const images = await this.previewImagesRepo.find({
        where: { themeId: In(ids) },
        order: { sortOrder: 'ASC' },
      });
      for (const img of images) {
        const list = byTheme.get(img.themeId) ?? [];
        list.push(img.imageUrl);
        byTheme.set(img.themeId, list);
      }
    }
    const data = await Promise.all(
      rows.map(async (t) => {
        const preview = await this.resolvePublicThemePreviewImage(
          t,
          byTheme.get(t.id) ?? [],
        );
        return {
          id: t.id,
          theme_name: t.themeName,
          preview_image: this.publicPreviewUrl(preview),
          base_layout: this.baseLayoutForGalleryRow(t),
          theme_family: t.themeType,
          version: t.themeVersion ?? '1.0',
          storefront_key: this.storefrontKeyFromTheme(t),
        };
      }),
    );
    return { success: true, data, meta: {}, message: '' };
  }

  private baseLayoutForGalleryRow(theme: Theme): string {
    const cfg = theme.themeConfigJson as
      | Record<string, unknown>
      | null
      | undefined;
    const mobile =
      cfg?.['mobile'] &&
      typeof cfg['mobile'] === 'object' &&
      !Array.isArray(cfg['mobile'])
        ? (cfg['mobile'] as Record<string, unknown>)
        : {};
    const fromNested =
      typeof mobile['base_layout'] === 'string'
        ? mobile['base_layout'].trim()
        : '';
    const fromRoot =
      typeof cfg?.['base_layout'] === 'string'
        ? String(cfg['base_layout']).trim()
        : '';
    if (fromNested) return fromNested;
    if (fromRoot) return fromRoot;
    return this.layoutHintFromStorefrontKey(this.storefrontKeyFromTheme(theme));
  }

  private layoutHintFromStorefrontKey(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('fast') || k.includes('quick')) return 'fast_order';
    if (k.includes('list')) return 'list';
    return 'grid';
  }

  private async resolveTenantMobileThemeAndWeb(tenantId: string): Promise<{
    mobileTheme: Theme | null;
    webTheme: Theme | null;
    tts: TenantThemeSettings | null;
    branding: TenantBranding | null;
  }> {
    const [tts, row, branding] = await Promise.all([
      this.tenantThemeSettingsRepo.findOne({
        where: { tenantId },
        relations: ['mobileTheme', 'webTheme'],
      }),
      this.tenantThemesRepo.findOne({
        where: { tenantId },
        relations: ['theme'],
      }),
      this.brandingRepo.findOne({ where: { tenantId } }),
    ]);

    const activeMobile = (t: Theme | null | undefined): Theme | null =>
      t && t.status === 'ACTIVE' && isMobileChannel(t) ? t : null;

    let mobileTheme = activeMobile(tts?.mobileTheme);

    const webCandidate =
      (tts?.webTheme &&
      tts.webTheme.status === 'ACTIVE' &&
      isWebChannel(tts.webTheme)
        ? tts.webTheme
        : null) ??
      (row?.theme && row.theme.status === 'ACTIVE' && isWebChannel(row.theme)
        ? row.theme
        : null);

    if (!mobileTheme && webCandidate) {
      const combo = await this.comboRepo.findOne({
        where: { webThemeId: webCandidate.id },
      });
      if (combo?.mobileThemeId) {
        const m = await this.themesRepo.findOne({
          where: { id: combo.mobileThemeId, status: 'ACTIVE' },
        });
        mobileTheme = activeMobile(m);
      }
    }

    if (
      !mobileTheme &&
      row?.theme?.status === 'ACTIVE' &&
      isMobileChannel(row.theme)
    ) {
      mobileTheme = row.theme;
    }

    let webTheme = webCandidate;
    if (
      !webTheme &&
      row?.theme?.status === 'ACTIVE' &&
      isWebChannel(row.theme)
    ) {
      webTheme = row.theme;
    }

    const bid = uuidOnly(branding?.themeId ?? null);
    if (!mobileTheme && bid) {
      const t = await this.themesRepo.findOne({
        where: { id: bid, status: 'ACTIVE' },
      });
      mobileTheme = activeMobile(t);
      if (!webTheme && t && isWebChannel(t)) webTheme = t;
    }

    return { mobileTheme, webTheme: webTheme ?? null, tts, branding };
  }

  private async resolveTenantIndustry(
    tenantId: string,
  ): Promise<StorefrontIndustryPayload> {
    const profile = await this.profileRepo.findOne({
      where: { tenantId },
      select: ['industryId'],
    });
    const industryId = uuidOnly(profile?.industryId ?? null);
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

  private composeMobileThemeBundle(params: {
    mobileTheme: Theme | null;
    webTheme: Theme | null;
    tts: TenantThemeSettings | null;
    branding: TenantBranding | null;
    tokens: Record<string, unknown>;
    selectedThemeTokens: Record<string, unknown>;
    industry: StorefrontIndustryPayload;
  }): {
    theme_id: string | null;
    theme_slug: string | null;
    theme_name: string | null;
    base_layout: string;
    config: Record<string, unknown>;
    branding: Record<string, unknown>;
    preview?: Record<string, unknown> | null;
  } {
    const defaultConfig: Record<string, unknown> = {
      card_style: 'rounded',
      spacing: 'compact',
      show_banner: true,
      enable_quick_qty: false,
    };
    let baseLayout = 'grid';
    const config: Record<string, unknown> = { ...defaultConfig };

    const mergeCfg = (raw: Record<string, unknown> | null | undefined) => {
      if (!raw) return;
      const manifest =
        raw['manifest'] &&
        typeof raw['manifest'] === 'object' &&
        !Array.isArray(raw['manifest'])
          ? (raw['manifest'] as Record<string, unknown>)
          : {};
      const mobile =
        raw['mobile'] &&
        typeof raw['mobile'] === 'object' &&
        !Array.isArray(raw['mobile'])
          ? (raw['mobile'] as Record<string, unknown>)
          : {};
      const manifestMobile =
        manifest['mobile'] &&
        typeof manifest['mobile'] === 'object' &&
        !Array.isArray(manifest['mobile'])
          ? (manifest['mobile'] as Record<string, unknown>)
          : {};
      const nestedConfig =
        raw['config'] &&
        typeof raw['config'] === 'object' &&
        !Array.isArray(raw['config'])
          ? (raw['config'] as Record<string, unknown>)
          : {};
      const bl =
        (typeof mobile['base_layout'] === 'string' &&
          mobile['base_layout'].trim()) ||
        (typeof manifestMobile['base_layout'] === 'string' &&
          manifestMobile['base_layout'].trim()) ||
        (typeof raw['base_layout'] === 'string' && raw['base_layout'].trim());
      if (bl) baseLayout = bl;
      for (const src of [nestedConfig, manifestMobile, mobile, raw]) {
        for (const k of [
          'card_style',
          'spacing',
          'show_banner',
          'enable_quick_qty',
          'compact',
        ] as const) {
          if (src[k] !== undefined && src[k] !== null) config[k] = src[k];
        }
      }
    };

    mergeCfg(
      params.webTheme?.themeConfigJson as Record<string, unknown> | undefined,
    );
    mergeCfg(
      params.mobileTheme?.themeConfigJson as
        | Record<string, unknown>
        | undefined,
    );

    if (!params.mobileTheme && params.webTheme && baseLayout === 'grid') {
      baseLayout = this.layoutHintFromStorefrontKey(
        this.storefrontKeyFromTheme(params.webTheme),
      );
    }

    const primary =
      this.readColorToken(params.tokens, 'primary', 'colorPrimary') ||
      this.readColorToken(
        params.selectedThemeTokens,
        'primary',
        'colorPrimary',
      ) ||
      params.tts?.primaryColor?.trim() ||
      params.branding?.primaryColor?.trim() ||
      '#1565C0';

    const logoRel =
      params.tts?.logoUrl?.trim() || params.branding?.logoUrl?.trim() || '';
    const logoData = params.branding?.logoDataUrl?.trim() || '';
    let logo = '';
    if (logoRel && /^https?:\/\//i.test(logoRel)) {
      logo = logoRel;
    } else if (logoRel.startsWith('/storage/')) {
      logo = publicStorageUrl(this.publicStorageCdnBase, logoRel);
    } else if (logoRel) {
      logo = logoRel;
    } else {
      logo = logoData;
    }

    const brandingOut: Record<string, unknown> = {
      primary_color: primary || '#1565C0',
      logo: logo || '',
      tagline: params.branding?.tagline?.trim() || '',
      industry_id: params.industry.industryId,
      industry_name: params.industry.industryName,
    };
    const sec =
      this.readColorToken(params.tokens, 'secondary', 'colorSecondary') ||
      this.readColorToken(
        params.selectedThemeTokens,
        'secondary',
        'colorSecondary',
      ) ||
      params.tts?.secondaryColor?.trim() ||
      params.branding?.secondaryColor?.trim() ||
      '';
    if (sec) brandingOut['secondary_color'] = sec;
    const surface =
      this.readColorToken(params.tokens, 'surface', 'colorSurface') ||
      this.readColorToken(
        params.selectedThemeTokens,
        'surface',
        'colorSurface',
      );
    if (surface) brandingOut['surface_color'] = surface;
    const text =
      this.readColorToken(params.tokens, 'text', 'colorText') ||
      this.readColorToken(params.tokens, 'ink', 'colorInk') ||
      this.readColorToken(params.selectedThemeTokens, 'text', 'colorText') ||
      this.readColorToken(params.selectedThemeTokens, 'ink', 'colorInk');
    if (text) brandingOut['text_color'] = text;

    return {
      theme_id: params.mobileTheme?.id ?? null,
      theme_slug: params.mobileTheme?.slug ?? null,
      theme_name: params.mobileTheme?.themeName ?? null,
      base_layout: baseLayout,
      config,
      branding: brandingOut,
    };
  }

  private readColorToken(
    tokens: Record<string, unknown>,
    nestedKey: string,
    flatKey: string,
  ): string {
    const flat = tokens[flatKey];
    if (typeof flat === 'string' && flat.trim()) return flat.trim();
    const colors = tokens['colors'];
    if (colors && typeof colors === 'object' && !Array.isArray(colors)) {
      const colorsMap = colors as Record<string, unknown>;
      const nested = colorsMap[nestedKey];
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
      for (const scheme of ['light', 'dark'] as const) {
        const schemeTokens = colorsMap[scheme];
        if (
          schemeTokens &&
          typeof schemeTokens === 'object' &&
          !Array.isArray(schemeTokens)
        ) {
          const value = (schemeTokens as Record<string, unknown>)[nestedKey];
          if (typeof value === 'string' && value.trim()) return value.trim();
        }
      }
    }
    return '';
  }

  private async selectMobileTheme(
    user: JwtUserPayload,
    mobileThemeId: string,
    tenantIdQuery?: string,
  ): Promise<{
    success: boolean;
    data: {
      tenantTheme: TenantTheme;
      tenantThemeSettings: TenantThemeSettings;
    };
    meta: Record<string, never>;
    message: string;
  }> {
    const startedAt = Date.now();
    const tenantId = tenantIdQuery?.trim() || user.tenantId || null;
    this.themeTelemetry.record('theme.selection.requested', {
      tenantId,
      actorRole: user.role,
      mode: 'mobile',
      mobileThemeId,
    });

    try {
      const result = await this.selectMobileThemeLegacy(
        user,
        mobileThemeId,
        tenantIdQuery,
      );
      this.themeTelemetry.record('theme.selection.completed', {
        tenantId,
        actorRole: user.role,
        mode: 'mobile',
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error: unknown) {
      this.themeTelemetry.record('theme.selection.failed', {
        tenantId,
        actorRole: user.role,
        mode: 'mobile',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async selectMobileThemeLegacy(
    user: JwtUserPayload,
    mobileThemeId: string,
    tenantIdQuery?: string,
  ): Promise<{
    success: boolean;
    data: {
      tenantTheme: TenantTheme;
      tenantThemeSettings: TenantThemeSettings;
    };
    meta: Record<string, never>;
    message: string;
  }> {
    const isElevated =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT;
    let tenantId: string | null;
    if (isElevated) {
      tenantId = tenantIdQuery?.trim() || user.tenantId || null;
    } else {
      tenantId = user.tenantId;
      if (tenantIdQuery && tenantIdQuery.trim() !== user.tenantId) {
        throw new ForbiddenException(
          'You cannot assign themes for another tenant.',
        );
      }
      const canChange =
        user.role === UserRole.OWNER ||
        user.role === UserRole.MANAGER ||
        user.role === UserRole.STAFF;
      if (!canChange || !tenantId) {
        throw new ForbiddenException(
          'You are not allowed to change the storefront theme for this account.',
        );
      }
    }
    if (!tenantId) {
      throw new BadRequestException(
        'tenantId is required (JWT has no tenant — pass tenant_id in the body).',
      );
    }

    const mob = await this.themesRepo.findOne({
      where: { id: mobileThemeId, status: 'ACTIVE' },
    });
    if (!mob || !isMobileChannel(mob))
      throw new BadRequestException('theme_id must be an ACTIVE MOBILE theme.');

    let tts = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
    });
    const row = await this.tenantThemesRepo.findOne({
      where: { tenantId },
      relations: ['theme'],
    });
    const webId =
      tts?.webThemeId ??
      (row?.theme && isWebChannel(row.theme) && row.theme.status === 'ACTIVE'
        ? row.theme.id
        : null);
    if (!webId) {
      throw new BadRequestException(
        'No web storefront theme is set for this tenant. Select a WEB theme first, then a mobile theme.',
      );
    }
    await this.assertWebMobilePair(webId, mobileThemeId);

    const priorTts = tts;
    const priorTenantTheme = row;
    const prevWeb = priorTts?.webThemeId ?? priorTenantTheme?.themeId ?? null;
    const prevMobile = priorTts?.mobileThemeId ?? null;
    const prevCombo = priorTts?.comboId ?? null;

    if (!tts) {
      tts = this.tenantThemeSettingsRepo.create({
        tenantId,
        webThemeId: webId,
        mobileThemeId,
        comboId: null,
      });
    } else {
      tts.webThemeId = webId;
      tts.mobileThemeId = mobileThemeId;
      tts.comboId = null;
    }
    await this.tenantThemeSettingsRepo.save(tts);

    let selected = await this.tenantThemesRepo.findOne({ where: { tenantId } });
    if (!selected) {
      selected = this.tenantThemesRepo.create({ tenantId, themeId: webId });
    } else {
      selected.themeId = webId;
    }
    const savedTenantTheme = await this.tenantThemesRepo.save(selected);

    const sameSelection =
      prevWeb === webId &&
      (prevMobile ?? null) === mobileThemeId &&
      (prevCombo ?? null) === null;
    if (!sameSelection) {
      const actorId = uuidOnly(user.sub);
      await this.tenantThemeChangeRepo.save(
        this.tenantThemeChangeRepo.create({
          tenantId,
          previousWebThemeId: prevWeb,
          newWebThemeId: webId,
          previousMobileThemeId: prevMobile,
          newMobileThemeId: mobileThemeId,
          previousComboId: prevCombo,
          newComboId: null,
          changedByUserId: actorId,
        }),
      );
    }

    await this.configRepo.save(
      this.configRepo.create({
        key: `tenant:${tenantId}:rebuild_required`,
        value: 'true',
      }),
    );

    this.enqueueThemeRebuild({
      tenantId,
      themeId: webId,
      mobileThemeId,
    });

    return {
      success: true,
      data: { tenantTheme: savedTenantTheme, tenantThemeSettings: tts },
      meta: {},
      message: 'Mobile theme updated. Rebuild queued.',
    };
  }

  private async assertWebMobilePair(
    webId: string,
    mobileId: string | null,
  ): Promise<void> {
    const web = await this.themesRepo.findOne({
      where: { id: webId, status: 'ACTIVE' },
    });
    if (!web) throw new BadRequestException('Web theme not found.');
    if (!isWebChannel(web))
      throw new BadRequestException('Selected web slot must be a WEB theme.');
    if (mobileId) {
      const mob = await this.themesRepo.findOne({
        where: { id: mobileId, status: 'ACTIVE' },
      });
      if (!mob) throw new BadRequestException('Mobile theme not found.');
      if (!isMobileChannel(mob))
        throw new BadRequestException(
          'Selected mobile slot must be a MOBILE theme.',
        );
    }
  }

  async select(user: JwtUserPayload, dto: SelectThemeDto) {
    const startedAt = Date.now();
    const mode = dto.comboId
      ? 'combo'
      : dto.webThemeId && dto.mobileThemeId
        ? 'split'
        : 'theme';
    this.themeTelemetry.record('theme.selection.requested', {
      tenantId: dto.tenantId?.trim() || user.tenantId || null,
      actorRole: user.role,
      mode,
      themeId: dto.themeId ?? null,
      comboId: dto.comboId ?? null,
      webThemeId: dto.webThemeId ?? null,
      mobileThemeId: dto.mobileThemeId ?? null,
    });

    try {
      const result = await this.selectLegacy(user, dto);
      this.themeTelemetry.record('theme.selection.completed', {
        tenantId: dto.tenantId?.trim() || user.tenantId || null,
        actorRole: user.role,
        mode,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error: unknown) {
      this.themeTelemetry.record('theme.selection.failed', {
        tenantId: dto.tenantId?.trim() || user.tenantId || null,
        actorRole: user.role,
        mode,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async selectLegacy(user: JwtUserPayload, dto: SelectThemeDto) {
    const isElevated =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_SUPPORT;
    let tenantId: string | null;
    if (isElevated) {
      tenantId = dto.tenantId?.trim() || user.tenantId || null;
    } else {
      tenantId = user.tenantId;
      if (dto.tenantId && dto.tenantId.trim() !== user.tenantId) {
        throw new ForbiddenException(
          'You cannot assign themes for another tenant.',
        );
      }
      const canChange =
        user.role === UserRole.OWNER ||
        user.role === UserRole.MANAGER ||
        user.role === UserRole.STAFF;
      if (!canChange || !tenantId) {
        throw new ForbiddenException(
          'You are not allowed to change the storefront theme for this account.',
        );
      }
    }
    if (!tenantId) {
      throw new BadRequestException(
        'tenantId is required (JWT has no tenant — pass tenantId in the body).',
      );
    }

    const hasLegacy = !!dto.themeId;
    const hasCombo = !!dto.comboId;
    const hasSplit = !!(dto.webThemeId && dto.mobileThemeId);
    const modes = (hasLegacy ? 1 : 0) + (hasCombo ? 1 : 0) + (hasSplit ? 1 : 0);
    if (modes !== 1) {
      throw new BadRequestException(
        'Provide exactly one of: themeId (web storefront), comboId (pack), or webThemeId + mobileThemeId together.',
      );
    }

    let webId: string;
    let mobileId: string | null;
    let comboPk: string | null;

    if (hasCombo) {
      const combo = await this.comboRepo.findOne({
        where: { id: dto.comboId },
      });
      if (!combo) throw new BadRequestException('Combo pack not found.');
      if (combo.status !== 'ACTIVE') {
        throw new BadRequestException('Combo pack is not active.');
      }
      webId = combo.webThemeId;
      mobileId = combo.mobileThemeId;
      comboPk = combo.id;
    } else if (hasSplit) {
      webId = dto.webThemeId!;
      mobileId = dto.mobileThemeId!;
      comboPk = null;
    } else {
      webId = dto.themeId!;
      const combo = await this.comboRepo.findOne({
        where: { webThemeId: webId },
      });
      mobileId = combo?.mobileThemeId ?? null;
      comboPk = combo?.id ?? null;
    }

    await this.assertWebMobilePair(webId, mobileId);

    const priorTts = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
    });
    const priorTenantTheme = await this.tenantThemesRepo.findOne({
      where: { tenantId },
    });
    const prevWeb = priorTts?.webThemeId ?? priorTenantTheme?.themeId ?? null;
    const prevMobile = priorTts?.mobileThemeId ?? null;
    const prevCombo = priorTts?.comboId ?? null;

    let selected = await this.tenantThemesRepo.findOne({ where: { tenantId } });
    if (!selected) {
      selected = this.tenantThemesRepo.create({ tenantId, themeId: webId });
    } else {
      selected.themeId = webId;
    }
    const savedTenantTheme = await this.tenantThemesRepo.save(selected);

    let tts = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
    });
    if (!tts) {
      tts = this.tenantThemeSettingsRepo.create({
        tenantId,
        webThemeId: webId,
        mobileThemeId: mobileId,
        comboId: comboPk,
      });
    } else {
      tts.webThemeId = webId;
      tts.mobileThemeId = mobileId;
      tts.comboId = comboPk;
    }
    await this.tenantThemeSettingsRepo.save(tts);

    const sameSelection =
      prevWeb === webId &&
      (prevMobile ?? null) === (mobileId ?? null) &&
      (prevCombo ?? null) === (comboPk ?? null);
    if (!sameSelection) {
      const actorId = uuidOnly(user.sub);
      await this.tenantThemeChangeRepo.save(
        this.tenantThemeChangeRepo.create({
          tenantId,
          previousWebThemeId: prevWeb,
          newWebThemeId: webId,
          previousMobileThemeId: prevMobile,
          newMobileThemeId: mobileId,
          previousComboId: prevCombo,
          newComboId: comboPk,
          changedByUserId: actorId,
        }),
      );
    }

    await this.configRepo.save(
      this.configRepo.create({
        key: `tenant:${tenantId}:rebuild_required`,
        value: 'true',
      }),
    );

    this.enqueueThemeRebuild({
      tenantId,
      themeId: webId,
      mobileThemeId: mobileId,
    });

    return {
      success: true,
      data: { tenantTheme: savedTenantTheme, tenantThemeSettings: tts },
      meta: {},
      message: 'Theme selected. Rebuild queued.',
    };
  }

  /** Distributor + super-admin: last theme switches for a tenant (append-only audit). */
  async listTenantThemeChangeHistory(
    user: JwtUserPayload,
    tenantIdQuery?: string,
  ) {
    const tenantId = this.resolveTenantIdForEdit(user, tenantIdQuery);
    const rows = await this.tenantThemeChangeRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['changedByUser'],
    });
    const themeIds = new Set<string>();
    const comboIds = new Set<string>();
    for (const r of rows) {
      if (r.previousWebThemeId) themeIds.add(r.previousWebThemeId);
      themeIds.add(r.newWebThemeId);
      if (r.previousMobileThemeId) themeIds.add(r.previousMobileThemeId);
      if (r.newMobileThemeId) themeIds.add(r.newMobileThemeId);
      if (r.previousComboId) comboIds.add(r.previousComboId);
      if (r.newComboId) comboIds.add(r.newComboId);
    }
    const themes =
      themeIds.size > 0
        ? await this.themesRepo.find({ where: { id: In([...themeIds]) } })
        : [];
    const themeById = new Map(themes.map((t) => [t.id, t]));
    const combos =
      comboIds.size > 0
        ? await this.comboRepo.find({ where: { id: In([...comboIds]) } })
        : [];
    const comboById = new Map(combos.map((c) => [c.id, c]));

    const label = (id: string | null | undefined): string | null => {
      if (!id) return null;
      const t = themeById.get(id);
      if (!t) return '(removed)';
      const chLabel = t.themeChannel === 'MOBILE' ? 'mobile' : 'web';
      return `${t.themeName} (${chLabel}${t.slug ? ` · ${t.slug}` : ''})`;
    };

    const entries = rows.map((r) => ({
      id: r.id,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      changedByUserId: r.changedByUserId,
      changedByEmail: r.changedByUser?.email ?? null,
      previous: {
        webThemeId: r.previousWebThemeId,
        webLabel: label(r.previousWebThemeId),
        mobileThemeId: r.previousMobileThemeId,
        mobileLabel: label(r.previousMobileThemeId),
        comboId: r.previousComboId,
        comboName: r.previousComboId
          ? (comboById.get(r.previousComboId)?.name ?? '(removed)')
          : null,
      },
      current: {
        webThemeId: r.newWebThemeId,
        webLabel: label(r.newWebThemeId),
        mobileThemeId: r.newMobileThemeId,
        mobileLabel: label(r.newMobileThemeId),
        comboId: r.newComboId,
        comboName: r.newComboId
          ? (comboById.get(r.newComboId)?.name ?? '(removed)')
          : null,
      },
    }));

    return {
      success: true,
      data: { tenantId, entries },
      meta: {},
      message: '',
    };
  }
}
