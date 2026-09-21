export type RuntimeChannel = 'WEB' | 'MOBILE';
export type RuntimeCategory =
  | 'theme'
  | 'templates'
  | 'sections'
  | 'blocks'
  | 'components'
  | 'tokens'
  | 'assets'
  | 'locales'
  | 'runtimeConfiguration';

export type RuntimeDifference = {
  category: RuntimeCategory;
  path: string;
  legacyValue?: unknown;
  canonicalValue?: unknown;
};

export type RuntimeComparisonReport = {
  schemaVersion: 1;
  requestId: string;
  tenantId: string | null;
  channel: RuntimeChannel;
  status: 'MATCH' | 'DIFFERENT' | 'UNAVAILABLE' | 'ERROR';
  legacyResponseHash: string;
  canonicalResponseHash: string | null;
  legacyDurationMs: number | null;
  canonicalDurationMs: number | null;
  added: RuntimeDifference[];
  removed: RuntimeDifference[];
  changed: RuntimeDifference[];
  missing: RuntimeDifference[];
  compatibilityWarnings: string[];
  generatedAt: string;
};

export type CanonicalRuntimeResult = {
  response: Record<string, unknown>;
  resources: Record<RuntimeCategory, unknown>;
  responseHash: string;
  deploymentId: string;
  snapshotHash: string;
};
