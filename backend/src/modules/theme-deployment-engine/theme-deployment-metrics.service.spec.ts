import { ThemeDeploymentMetricsService } from './theme-deployment-metrics.service';

describe('ThemeDeploymentMetricsService', () => {
  it('counts deployment metrics', () => {
    const metrics = new ThemeDeploymentMetricsService();
    metrics.increment('queued');
    metrics.increment('queued');
    expect(metrics.snapshot()).toEqual({ queued: 2 });
  });
});
