export type ThemeMigrationPhase =
  | 'phase-0'
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6';
export type ThemeMigrationImplementation =
  | 'legacy'
  | 'canonical-backfill'
  | 'object-storage-artifact'
  | 'release-validation-pipeline'
  | 'deployment-engine'
  | 'runtime-shadow-comparison';
export type ThemeMigrationOutcome =
  | 'requested'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ThemeMigrationLogInput = {
  event: string;
  phase?: ThemeMigrationPhase;
  implementation?: ThemeMigrationImplementation;
  correlationId?: string | null;
  requestId?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  tenantId?: string | null;
  themeId?: string | null;
  themeReleaseId?: string | null;
  themeBundleId?: string | null;
  deploymentId?: string | null;
  legacyEntity?: string | null;
  legacyId?: string | null;
  channel?: string | null;
  platform?: string | null;
  mode?: string | null;
  actorRole?: string | null;
  durationMs?: number | null;
  errorType?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ThemeMigrationLog = {
  schemaVersion: 1;
  timestamp: string;
  component: 'theme-migration';
  phase: ThemeMigrationPhase;
  implementation: ThemeMigrationImplementation;
  event: string;
  operation: string;
  outcome: ThemeMigrationOutcome;
  correlationId: string | null;
  requestId: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  tenantId: string | null;
  themeId: string | null;
  themeReleaseId: string | null;
  themeBundleId: string | null;
  deploymentId: string | null;
  legacyEntity: string | null;
  legacyId: string | null;
  channel: string | null;
  mode: string | null;
  actorRole: string | null;
  durationMs: number | null;
  errorType: string | null;
  metadata: Record<string, unknown>;
};

function deriveOperation(event: string): string {
  const parts = event.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : event;
}

function deriveOutcome(event: string): ThemeMigrationOutcome {
  const outcome = event.split('.').at(-1);
  if (
    outcome === 'requested' ||
    outcome === 'completed' ||
    outcome === 'failed' ||
    outcome === 'skipped'
  ) {
    return outcome;
  }
  return 'completed';
}

function normalizeChannel(input: string | null | undefined): string | null {
  const value = String(input ?? '')
    .trim()
    .toUpperCase();
  if (value === 'WEB' || value === 'MOBILE') return value;
  return null;
}

const RESERVED_KEYS = new Set([
  'event',
  'phase',
  'implementation',
  'correlationId',
  'requestId',
  'requestMethod',
  'requestPath',
  'tenantId',
  'themeId',
  'themeReleaseId',
  'themeBundleId',
  'deploymentId',
  'legacyEntity',
  'legacyId',
  'channel',
  'platform',
  'mode',
  'actorRole',
  'durationMs',
  'errorType',
  'metadata',
]);

const SENSITIVE_METADATA_KEY =
  /(?:password|secret|token|authorization|cookie|raw.?payload|body|buffer|storage.?path|archive.?key)/i;

function sanitizeMetadataValue(
  value: unknown,
  key: string,
  depth = 0,
): unknown {
  if (SENSITIVE_METADATA_KEY.test(key)) return '[REDACTED]';
  if (depth > 3) return '[TRUNCATED]';
  if (typeof value === 'string')
    return value.length > 512 ? `${value.slice(0, 512)}…` : value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeMetadataValue(item, key, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([childKey, childValue]) => [
          childKey,
          sanitizeMetadataValue(childValue, childKey, depth + 1),
        ]),
    );
  }
  return value;
}

export function createThemeMigrationLog(
  input: ThemeMigrationLogInput,
): ThemeMigrationLog {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    metadata[key] = sanitizeMetadataValue(value, key);
  }
  for (const [key, value] of Object.entries(input)) {
    if (!RESERVED_KEYS.has(key) && value !== undefined) {
      metadata[key] = sanitizeMetadataValue(value, key);
    }
  }

  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    component: 'theme-migration',
    phase: input.phase ?? 'phase-0',
    implementation: input.implementation ?? 'legacy',
    event: input.event,
    operation: deriveOperation(input.event),
    outcome: deriveOutcome(input.event),
    correlationId: input.correlationId ?? null,
    requestId: input.requestId ?? null,
    requestMethod: input.requestMethod ?? null,
    requestPath: input.requestPath ?? null,
    tenantId: input.tenantId ?? null,
    themeId: input.themeId ?? null,
    themeReleaseId: input.themeReleaseId ?? null,
    themeBundleId: input.themeBundleId ?? null,
    deploymentId: input.deploymentId ?? null,
    legacyEntity: input.legacyEntity ?? null,
    legacyId: input.legacyId ?? null,
    channel: normalizeChannel(input.channel ?? input.platform),
    mode: input.mode ?? null,
    actorRole: input.actorRole ?? null,
    durationMs: input.durationMs ?? null,
    errorType: input.errorType ?? null,
    metadata,
  };
}

export function writeThemeMigrationLog(input: ThemeMigrationLogInput): void {
  process.stdout.write(`${JSON.stringify(createThemeMigrationLog(input))}\n`);
}
