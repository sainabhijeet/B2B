import { createHash } from 'node:crypto';
import type {
  RuntimeCategory,
  RuntimeComparisonReport,
  RuntimeDifference,
} from './runtime-contracts';

export function stableJson(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

export function hashRuntimeResponse(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function flatten(value: unknown, prefix = ''): Map<string, unknown> {
  const output = new Map<string, unknown>();
  if (value === null || typeof value !== 'object') {
    output.set(prefix || '$', value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flatten(item, `${prefix}[${index}]`).forEach((child, key) =>
        output.set(key, child),
      ),
    );
    if (value.length === 0) output.set(prefix || '$', []);
    return output;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) output.set(prefix || '$', {});
  keys.forEach((key) =>
    flatten(record[key], prefix ? `${prefix}.${key}` : key).forEach(
      (child, childKey) => output.set(childKey, child),
    ),
  );
  return output;
}

export function compareRuntimeResources(
  legacyResources: Record<RuntimeCategory, unknown>,
  canonicalResources: Record<RuntimeCategory, unknown>,
  base: Omit<
    RuntimeComparisonReport,
    | 'added'
    | 'removed'
    | 'changed'
    | 'missing'
    | 'status'
    | 'compatibilityWarnings'
  >,
): RuntimeComparisonReport {
  const added: RuntimeDifference[] = [];
  const removed: RuntimeDifference[] = [];
  const changed: RuntimeDifference[] = [];
  const missing: RuntimeDifference[] = [];
  const warnings: string[] = [];
  const categories: RuntimeCategory[] = [
    'theme',
    'templates',
    'sections',
    'blocks',
    'components',
    'tokens',
    'assets',
    'locales',
    'runtimeConfiguration',
  ];
  for (const category of categories) {
    const legacy = flatten(legacyResources[category]);
    const canonical = flatten(canonicalResources[category]);
    for (const [path, canonicalValue] of canonical) {
      if (!legacy.has(path)) {
        added.push({ category, path, canonicalValue });
        if (
          [
            'templates',
            'sections',
            'blocks',
            'components',
            'tokens',
            'assets',
            'locales',
          ].includes(category)
        )
          missing.push({ category, path, canonicalValue });
      } else if (stableJson(legacy.get(path)) !== stableJson(canonicalValue)) {
        changed.push({
          category,
          path,
          legacyValue: legacy.get(path),
          canonicalValue,
        });
      }
    }
    for (const [path, legacyValue] of legacy) {
      if (!canonical.has(path)) removed.push({ category, path, legacyValue });
    }
  }
  if (base.legacyResponseHash !== base.canonicalResponseHash)
    warnings.push('Legacy and canonical response hashes differ.');
  if (
    added.some(
      (item) => item.category === 'templates' || item.category === 'sections',
    )
  )
    warnings.push('Canonical runtime exposes template or section differences.');
  if (added.some((item) => item.category === 'assets'))
    warnings.push(
      'Canonical runtime references assets not represented by the legacy response.',
    );
  const status =
    added.length || removed.length || changed.length || missing.length
      ? 'DIFFERENT'
      : 'MATCH';
  return {
    ...base,
    status,
    added,
    removed,
    changed,
    missing,
    compatibilityWarnings: warnings,
  };
}
