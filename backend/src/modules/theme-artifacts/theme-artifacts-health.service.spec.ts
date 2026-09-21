import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { ThemeArtifactsHealthService } from './theme-artifacts-health.service';
import { ThemeArtifactMetricsService } from './storage/theme-artifact-metrics.service';

describe('ThemeArtifactsHealthService', () => {
  it('does not access object storage or artifact rows before migration', async () => {
    const config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService;
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;
    const repository = { count: jest.fn() };
    const objectStorage = {
      isConfigured: jest.fn().mockReturnValue(false),
      healthCheck: jest.fn(),
    };
    const service = new ThemeArtifactsHealthService(
      config,
      dataSource,
      repository as never,
      objectStorage as never,
      new ThemeArtifactMetricsService(),
    );

    const result = await service.getHealth();

    expect(result.data).toEqual(
      expect.objectContaining({
        status: 'pending_migration',
        artifactCount: null,
      }),
    );
    expect(repository.count).not.toHaveBeenCalled();
    expect(objectStorage.healthCheck).not.toHaveBeenCalled();
  });
});
