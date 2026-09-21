import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ThemeChannel } from '../../../common/entities/theme.entity';
import {
  isKnownRegistrySectionType,
  readAndValidateThemeManifest,
  validateThemeTemplateFiles,
} from '../../themes/theme-manifest.util';
import type { ThemeManifestV1 } from '../../themes/theme-manifest.util';
import { validateThemeZipPackage } from '../../themes/theme-zip-validator';
import { isSafeRelativePath } from './zip-structure.validator';
import { issue, ValidationIssue } from './validation-report.types';

export type ManifestValidation = {
  manifest: Record<string, unknown> | null;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
};

function versionIsValid(version: string): boolean {
  return /^\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(version.trim());
}

function manifestMajor(version: unknown): number | null {
  if (typeof version !== 'string') return null;
  const value = Number.parseInt(version.split('.')[0] ?? '', 10);
  return Number.isFinite(value) ? value : null;
}

async function validateJsonSchemas(
  root: string,
): Promise<{ errors: ValidationIssue[]; warnings: ValidationIssue[] }> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  for (const directory of ['sections', 'blocks', 'components']) {
    const absolute = path.join(root, directory);
    let names: string[];
    try {
      names = await fs.readdir(absolute);
    } catch {
      continue;
    }
    for (const name of names.filter((value) =>
      value.endsWith('.schema.json'),
    )) {
      const relative = `${directory}/${name}`;
      try {
        const parsed = JSON.parse(
          await fs.readFile(path.join(absolute, name), 'utf8'),
        ) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.push(
            issue(
              'INVALID_JSON_SCHEMA',
              'ERROR',
              'JSON schema root must be an object.',
              relative,
            ),
          );
          continue;
        }
        const schema = parsed as Record<string, unknown>;
        if (schema.type !== undefined && typeof schema.type !== 'string') {
          errors.push(
            issue(
              'INVALID_JSON_SCHEMA',
              'ERROR',
              'Schema "type" must be a string.',
              relative,
            ),
          );
        }
        if (
          schema.properties !== undefined &&
          (typeof schema.properties !== 'object' ||
            schema.properties === null ||
            Array.isArray(schema.properties))
        ) {
          errors.push(
            issue(
              'INVALID_JSON_SCHEMA',
              'ERROR',
              'Schema "properties" must be an object.',
              relative,
            ),
          );
        }
        if (schema.name !== undefined && typeof schema.name !== 'string') {
          errors.push(
            issue(
              'INVALID_JSON_SCHEMA',
              'ERROR',
              'Schema "name" must be a string.',
              relative,
            ),
          );
        }
      } catch {
        errors.push(
          issue(
            'INVALID_JSON_SCHEMA',
            'ERROR',
            'Schema file contains invalid JSON.',
            relative,
          ),
        );
      }
    }
  }
  return { errors, warnings };
}

export async function validateManifest(
  root: string,
  channel: ThemeChannel,
  supportedEngineMajor: number,
): Promise<ManifestValidation> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: ValidationIssue[] = [];
  let manifest: Record<string, unknown> | null = null;
  try {
    manifest = await readAndValidateThemeManifest(root);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Manifest validation failed.';
    const code = message.includes('include theme.json')
      ? 'MISSING_MANIFEST'
      : message.includes('valid JSON')
        ? 'INVALID_JSON'
        : 'INVALID_THEME_STRUCTURE';
    errors.push(issue(code, 'ERROR', message, 'theme.json'));
    return { manifest, errors, warnings, suggestions };
  }

  const version = manifest.version;
  if (typeof version !== 'string' || !versionIsValid(version)) {
    errors.push(
      issue(
        'INVALID_VERSION',
        'ERROR',
        'Manifest version must use numeric major.minor[.patch] syntax.',
        'theme.json.version',
      ),
    );
  }
  const major = manifestMajor(version);
  if (major !== null && major > supportedEngineMajor) {
    errors.push(
      issue(
        'UNSUPPORTED_ENGINE_VERSION',
        'ERROR',
        `Manifest major version ${major} exceeds supported engine major ${supportedEngineMajor}.`,
        'theme.json.version',
      ),
    );
  }
  const engine = manifest.engineVersion ?? manifest.engine;
  if (typeof engine === 'string') {
    const engineMajor = manifestMajor(engine);
    if (engineMajor !== null && engineMajor > supportedEngineMajor) {
      errors.push(
        issue(
          'UNSUPPORTED_ENGINE_VERSION',
          'ERROR',
          `Theme engine ${engine} is not supported.`,
          'theme.json.engine',
        ),
      );
    }
  }
  if (channel === 'WEB') {
    try {
      await validateThemeTemplateFiles(root, manifest as ThemeManifestV1);
    } catch (error) {
      errors.push(
        issue(
          'INVALID_THEME_STRUCTURE',
          'ERROR',
          error instanceof Error
            ? error.message
            : 'Theme template structure is invalid.',
        ),
      );
    }
  } else if (!manifest.templates) {
    warnings.push(
      issue(
        'MOBILE_TEMPLATE_METADATA_MISSING',
        'WARNING',
        'Mobile package has no templates declaration.',
        'theme.json.templates',
      ),
    );
  }
  const packageValidation = await validateThemeZipPackage(
    root,
    manifest as ThemeManifestV1,
    { channel },
  );
  errors.push(
    ...packageValidation.errors.map((message) =>
      issue('INVALID_THEME_STRUCTURE', 'ERROR', message),
    ),
  );
  warnings.push(
    ...packageValidation.warnings.map((message) =>
      issue('UNSUPPORTED_COMPONENT', 'WARNING', message),
    ),
  );
  const schemas = await validateJsonSchemas(root);
  errors.push(...schemas.errors);
  warnings.push(...schemas.warnings);
  if (!manifest.name)
    suggestions.push(
      issue(
        'MISSING_DISPLAY_NAME',
        'SUGGESTION',
        'Add a human-readable theme name.',
        'theme.json.name',
      ),
    );
  const allowedSections = manifest.allowedSections ?? manifest.allowed_sections;
  if (Array.isArray(allowedSections)) {
    for (const section of allowedSections) {
      if (typeof section === 'string' && !isKnownRegistrySectionType(section)) {
        warnings.push(
          issue(
            'UNSUPPORTED_COMPONENT',
            'WARNING',
            `Section "${section}" is not in the platform registry.`,
            'theme.json.allowedSections',
          ),
        );
      }
    }
  }
  return { manifest, errors, warnings, suggestions };
}

export { isSafeRelativePath };
