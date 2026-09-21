import {
  boundRuntimeReport,
  decodeReportCursor,
  encodeReportCursor,
  redactRuntimeValue,
} from './runtime-report-hardening';
import type { RuntimeComparisonReport } from './runtime-contracts';

describe('runtime report hardening', () => {
  const report: RuntimeComparisonReport = {
    schemaVersion: 1,
    requestId: 'request-1',
    tenantId: null,
    channel: 'WEB',
    status: 'DIFFERENT',
    legacyResponseHash: 'a'.repeat(64),
    canonicalResponseHash: 'b'.repeat(64),
    legacyDurationMs: 1,
    canonicalDurationMs: 2,
    added: [],
    removed: [],
    changed: [],
    missing: [],
    compatibilityWarnings: [],
    generatedAt: new Date().toISOString(),
  };

  it('redacts sensitive nested keys', () => {
    expect(
      redactRuntimeValue({ token: 'safe', accessToken: 'secret' }),
    ).toEqual({ token: 'safe', accessToken: '[REDACTED]' });
  });

  it('bounds oversized difference collections', () => {
    const oversized = {
      ...report,
      changed: Array.from({ length: 20 }, (_, index) => ({
        category: 'tokens' as const,
        path: `x${index}`,
        legacyValue: 'x'.repeat(100),
      })),
    };
    const bounded = boundRuntimeReport(oversized, 900);
    expect(Buffer.byteLength(JSON.stringify(bounded))).toBeLessThanOrEqual(900);
    expect(bounded.compatibilityWarnings.length).toBeGreaterThan(0);
  });

  it('round trips pagination cursors', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const cursor = encodeReportCursor(date, 'report-1');
    expect(decodeReportCursor(cursor)).toEqual({
      createdAt: date,
      id: 'report-1',
    });
  });
});
