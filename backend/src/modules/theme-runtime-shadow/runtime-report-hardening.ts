import type { RuntimeComparisonReport } from './runtime-contracts';

const SENSITIVE_KEY =
  /(password|secret|authorization|cookie|private[_-]?key|access[_-]?token|refresh[_-]?token)/i;

export function redactRuntimeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactRuntimeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactRuntimeValue(item),
    ]),
  );
}

export function boundRuntimeReport(
  report: RuntimeComparisonReport,
  maxBytes: number,
): RuntimeComparisonReport {
  const safe = redactRuntimeValue(report) as RuntimeComparisonReport;
  const fits = () =>
    Buffer.byteLength(JSON.stringify(safe), 'utf8') <= maxBytes;
  if (fits()) return safe;

  const categories = ['added', 'removed', 'changed', 'missing'] as const;
  for (const category of categories) {
    while (safe[category].length && !fits()) safe[category].pop();
  }
  safe.compatibilityWarnings = [
    ...safe.compatibilityWarnings,
    'Comparison report was truncated to its configured size limit.',
  ];
  if (!fits()) {
    safe.added = [];
    safe.removed = [];
    safe.changed = [];
    safe.missing = [];
    safe.compatibilityWarnings = safe.compatibilityWarnings.slice(-1);
  }
  return safe;
}

export function encodeReportCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
  ).toString('base64url');
}

export function decodeReportCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as { createdAt?: string; id?: string };
    const createdAt = new Date(value.createdAt ?? '');
    if (!value.id || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: value.id };
  } catch {
    return null;
  }
}
