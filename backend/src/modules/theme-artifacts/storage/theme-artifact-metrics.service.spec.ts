import { ThemeArtifactMetricsService } from './theme-artifact-metrics.service';

describe('ThemeArtifactMetricsService', () => {
  it('records immutable artifact operation counters without changing runtime state', () => {
    const service = new ThemeArtifactMetricsService();
    service.record('artifact.import', 'success', 12, 100);
    service.record('artifact.import', 'skipped');
    service.record('artifact.import', 'failure', 4);

    expect(service.snapshot()).toEqual({
      operations: {
        'artifact.import': { success: 1, failure: 1, skipped: 1 },
      },
      bytesUploaded: 100,
      durationsMs: { count: 3, total: 16, max: 12 },
    });
  });
});
