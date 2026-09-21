import { ThemeReleaseLifecycleMetricsService } from './theme-release-lifecycle-metrics.service';

describe('ThemeReleaseLifecycleMetricsService', () => {
  it('tracks lifecycle action counters', () => {
    const metrics = new ThemeReleaseLifecycleMetricsService();
    metrics.increment('approve');
    metrics.increment('approve');
    metrics.increment('publish');
    expect(metrics.snapshot()).toEqual({ approve: 2, publish: 1 });
  });
});
