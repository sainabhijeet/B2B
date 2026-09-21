import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Repository } from 'typeorm';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { Theme } from '../../common/entities/theme.entity';
import type { ThemeManifestDTO } from './dto/theme-manifest.dto';
import {
  extractAllowedBlocksFromManifestJson,
  extractAllowedSectionsFromManifestJson,
  extractCapabilitiesVariantsFromManifest,
} from './theme-manifest.util';

/** Join optional CDN origin with a path that starts with `/`. */
function publicStorageUrl(cdnBase: string, relPath: string): string {
  const p = relPath.startsWith('/') ? relPath : `/${relPath}`;
  const base = cdnBase.replace(/\/$/, '');
  return base ? `${base}${p}` : p;
}

/**
 * DB-backed normalized manifest for consumers that should not parse full `theme.json` or touch disk
 * for core allow-lists. Optional preset filenames are read from `storage/.../presets` when present.
 * (Redis / in-memory TTL cache can wrap `getManifest` later.)
 */
@Injectable()
export class ThemeManifestCacheService {
  private readonly publicStorageCdnBase: string;

  constructor(
    @InjectRepository(Theme)
    private readonly themesRepo: Repository<Theme>,
    configService: ConfigService,
  ) {
    this.publicStorageCdnBase =
      configService.get<string>('assets.publicStorageCdnUrl') ?? '';
  }

  async getManifest(themeId: string): Promise<ThemeManifestDTO> {
    const theme = await this.themesRepo.findOne({ where: { id: themeId } });
    if (!theme) {
      throw new NotFoundException(`Theme not found: ${themeId}`);
    }
    return this.normalize(theme);
  }

  private async normalize(theme: Theme): Promise<ThemeManifestDTO> {
    const cfg = (theme.themeConfigJson ?? {}) as Record<string, unknown>;
    const manifest =
      (cfg.manifest as Record<string, unknown> | undefined) ?? {};

    const templatesRaw = manifest.templates;
    const templateKeys =
      templatesRaw &&
      typeof templatesRaw === 'object' &&
      !Array.isArray(templatesRaw)
        ? Object.keys(templatesRaw as Record<string, unknown>)
        : [];

    const allowedSections =
      extractAllowedSectionsFromManifestJson(manifest) ?? [];
    const allowedBlocks = extractAllowedBlocksFromManifestJson(manifest) ?? [];
    const allowedVariants = extractCapabilitiesVariantsFromManifest(manifest);

    const fromManifestPresets = Array.isArray(manifest.presets)
      ? (manifest.presets as unknown[]).filter(
          (x): x is string => typeof x === 'string' && x.trim().length > 0,
        )
      : [];

    const sp =
      theme.storagePath?.trim().replace(/^\/+/, '').replace(/\\/g, '/') ?? '';
    const subdir = theme.themeChannel === 'MOBILE' ? 'mobile' : 'web';
    const fromSlug =
      theme.slug?.trim() && !sp
        ? path.posix.join('themes', subdir, theme.slug.trim())
        : '';
    const assetRoot = sp || fromSlug;

    const fromDisk = await this.listPresetFileNames(assetRoot || null);
    const presets = dedupeStrings([
      ...fromManifestPresets.map((s) => s.trim()),
      ...fromDisk,
    ]);

    const version =
      typeof manifest.version === 'string' && manifest.version.trim()
        ? manifest.version.trim()
        : String(theme.themeVersion ?? '1.0').trim() || '1.0';
    const assetsRel = assetRoot
      ? `/storage/${assetRoot}/assets`
      : `/storage/themes/${subdir}/_missing-path/${theme.id}/assets`;
    const assetsBaseUrl = publicStorageUrl(
      this.publicStorageCdnBase,
      assetsRel,
    );

    return {
      themeId: theme.id,
      version,
      allowedSections,
      allowedVariants,
      allowedBlocks,
      templates: templateKeys,
      presets,
      assetsBaseUrl,
    };
  }

  private async listPresetFileNames(
    storagePath: string | null | undefined,
  ): Promise<string[]> {
    const sp = storagePath?.trim().replace(/^\/+/, '').replace(/\\/g, '/');
    if (!sp) return [];
    const presetDir = path.join(getBackendStorageRoot(), sp, 'presets');
    let entries: string[];
    try {
      entries = await fs.readdir(presetDir);
    } catch {
      return [];
    }
    return entries.filter((n) => n.toLowerCase().endsWith('.json')).sort();
  }
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
