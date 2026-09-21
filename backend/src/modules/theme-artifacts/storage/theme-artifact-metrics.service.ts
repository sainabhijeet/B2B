import { Injectable } from '@nestjs/common';

type MetricOutcome = 'success' | 'failure' | 'skipped';

export type ThemeArtifactMetricsSnapshot = {
  operations: Record<
    string,
    { success: number; failure: number; skipped: number }
  >;
  bytesUploaded: number;
  durationsMs: { count: number; total: number; max: number };
};

@Injectable()
export class ThemeArtifactMetricsService {
  private readonly operations = new Map<
    string,
    { success: number; failure: number; skipped: number }
  >();
  private bytesUploaded = 0;
  private durationCount = 0;
  private durationTotal = 0;
  private durationMax = 0;

  record(
    operation: string,
    outcome: MetricOutcome,
    durationMs = 0,
    bytesUploaded = 0,
  ): void {
    const current = this.operations.get(operation) ?? {
      success: 0,
      failure: 0,
      skipped: 0,
    };
    current[outcome] += 1;
    this.operations.set(operation, current);
    this.bytesUploaded += Math.max(0, bytesUploaded);
    this.durationCount += 1;
    this.durationTotal += Math.max(0, durationMs);
    this.durationMax = Math.max(this.durationMax, durationMs);
  }

  snapshot(): ThemeArtifactMetricsSnapshot {
    return {
      operations: Object.fromEntries(
        [...this.operations.entries()].map(([operation, counts]) => [
          operation,
          { ...counts },
        ]),
      ),
      bytesUploaded: this.bytesUploaded,
      durationsMs: {
        count: this.durationCount,
        total: this.durationTotal,
        max: this.durationMax,
      },
    };
  }
}
