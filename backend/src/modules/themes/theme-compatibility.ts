import {
  extractAllowedBlocksFromManifestJson,
  extractAllowedSectionsFromManifestJson,
} from './theme-manifest.util';

/** Rows for docs + API: which engine expects which manifest features (avoid silent schema drift). */
export const THEME_COMPATIBILITY_MATRIX = [
  {
    engine: 'registry-v1',
    minManifestMajor: 1,
    features: [
      'templates_json',
      'optional_allowed_sections',
      'optional_capabilities_nested',
    ],
  },
  {
    engine: 'registry-v2',
    minManifestMajor: 2,
    features: [
      'tokens_bundle',
      'components_contract',
      'allowed_sections',
      'capabilities_blocks',
    ],
  },
] as const;

export type ThemeCompatibilitySummary = {
  engine: 'registry-v1';
  level: 'full' | 'legacy' | 'partial' | 'unknown';
  matrix_row: 'registry-v1' | 'registry-v2';
  manifest_major: number | null;
  notes: string[];
};

function manifestMajorVersion(
  manifest: Record<string, unknown> | null,
): number | null {
  if (!manifest) return null;
  const v = manifest.version;
  if (typeof v !== 'string' || !v.trim()) return null;
  const major = Number.parseInt(String(v).split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : null;
}

export function summarizeThemeCompatibility(
  manifest: Record<string, unknown> | null,
  ctx: { hasStoragePath: boolean },
): ThemeCompatibilitySummary {
  const notes: string[] = [];
  if (!ctx.hasStoragePath) {
    return {
      engine: 'registry-v1',
      level: 'unknown',
      matrix_row: 'registry-v1',
      manifest_major: null,
      notes: [
        'Theme package has no storage path; manifest could not be resolved.',
      ],
    };
  }
  if (!manifest) {
    return {
      engine: 'registry-v1',
      level: 'unknown',
      matrix_row: 'registry-v1',
      manifest_major: null,
      notes: [
        'theme.json missing or unreadable — treat storefront as legacy defaults.',
      ],
    };
  }
  const major = manifestMajorVersion(manifest);
  const allowed = extractAllowedSectionsFromManifestJson(manifest);
  const blocks = extractAllowedBlocksFromManifestJson(manifest);
  const hasCapabilities =
    manifest.capabilities !== undefined &&
    typeof manifest.capabilities === 'object' &&
    manifest.capabilities !== null &&
    !Array.isArray(manifest.capabilities);
  if (!allowed?.length) {
    notes.push(
      'No section allow-list in manifest — distributor editor shows the full catalog (legacy-safe).',
    );
  }
  if (blocks?.length) {
    notes.push(
      'Block allow-list present under capabilities (future builder UI).',
    );
  } else if (hasCapabilities) {
    notes.push(
      'capabilities object present without block list — block picker unrestricted until schemas ship.',
    );
  }
  let level: ThemeCompatibilitySummary['level'] = 'full';
  if (major !== null && major < 2) {
    level = 'legacy';
    notes.push(
      'Manifest major < 2: expect v1-style templates; v2-only features may be absent.',
    );
  }
  if (major !== null && major >= 2) {
    level = allowed?.length ? 'full' : 'partial';
    if (!allowed?.length) {
      notes.push(
        'v2 manifest without allowed_sections — confirm templates before enabling strict picker.',
      );
    }
  }
  const matrixRow: ThemeCompatibilitySummary['matrix_row'] =
    major !== null && major >= 2 ? 'registry-v2' : 'registry-v1';
  return {
    engine: 'registry-v1',
    level,
    matrix_row: matrixRow,
    manifest_major: major,
    notes,
  };
}
