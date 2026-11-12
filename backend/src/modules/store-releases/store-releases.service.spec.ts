import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StoreReleasesService } from './store-releases.service';

const repo = <T extends object>(
  overrides: Partial<Record<string, jest.Mock>> = {},
) => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (value: T) => ({ id: 'saved-id', ...value })),
  create: jest.fn((value: T) => value),
  createQueryBuilder: jest.fn(),
  ...overrides,
});

describe('StoreReleasesService', () => {
  const actor = { sub: 'user-1', role: 'OWNER' as never, tenantId: 'tenant-1' };

  function makeService(overrides: Record<string, unknown> = {}) {
    const releases = repo();
    const events = repo();
    const settings = repo();
    const artifacts = repo();
    const buildJobs = repo();
    const appVersions = repo();
    const auditLogs = repo();
    const service = new StoreReleasesService(
      releases as never,
      events as never,
      settings as never,
      artifacts as never,
      buildJobs as never,
      appVersions as never,
      auditLogs as never,
    );
    return {
      service,
      repos: {
        releases,
        events,
        settings,
        artifacts,
        buildJobs,
        appVersions,
        auditLogs,
        ...overrides,
      },
    };
  }

  it('creates a draft release only for a successful same-tenant mobile artifact', async () => {
    const { service, repos } = makeService();
    repos.artifacts.findOne.mockResolvedValue({
      id: 'artifact-1',
      buildJobId: 'job-1',
      artifactType: 'AAB',
      versionName: '1.0.0',
      versionCode: 10,
    });
    repos.buildJobs.findOne.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      status: 'SUCCESS',
    });
    repos.appVersions.findOne.mockResolvedValue({ id: 'version-1' });
    repos.releases.save.mockImplementation(async (value) => ({
      id: 'release-1',
      ...value,
    }));

    const result = await service.createRelease('tenant-1', actor, {
      buildArtifactId: 'artifact-1',
      platform: 'ANDROID',
      storeProvider: 'GOOGLE_PLAY',
      track: 'internal',
    });

    expect(result).toMatchObject({
      id: 'release-1',
      tenantId: 'tenant-1',
      buildArtifactId: 'artifact-1',
      appVersionId: 'version-1',
      status: 'DRAFT',
    });
    expect(repos.events.save).toHaveBeenCalled();
    expect(repos.auditLogs.save).toHaveBeenCalled();
  });

  it('rejects cross-tenant build artifacts', async () => {
    const { service, repos } = makeService();
    repos.artifacts.findOne.mockResolvedValue({
      id: 'artifact-1',
      buildJobId: 'job-1',
      artifactType: 'AAB',
    });
    repos.buildJobs.findOne.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-2',
      status: 'SUCCESS',
    });

    await expect(
      service.createRelease('tenant-1', actor, {
        buildArtifactId: 'artifact-1',
        platform: 'ANDROID',
        storeProvider: 'GOOGLE_PLAY',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects incomplete builds', async () => {
    const { service, repos } = makeService();
    repos.artifacts.findOne.mockResolvedValue({
      id: 'artifact-1',
      buildJobId: 'job-1',
      artifactType: 'AAB',
    });
    repos.buildJobs.findOne.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      status: 'FAILED',
    });

    await expect(
      service.createRelease('tenant-1', actor, {
        buildArtifactId: 'artifact-1',
        platform: 'ANDROID',
        storeProvider: 'GOOGLE_PLAY',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('redacts settings credential material', async () => {
    const { service, repos } = makeService();
    repos.settings.find.mockResolvedValue([
      {
        id: 'settings-1',
        tenantId: 'tenant-1',
        platform: 'ANDROID',
        packageNameOrBundleId: 'com.example.app',
        releaseTrack: 'internal',
        credentialStatus: 'CONFIGURED',
        encryptedCredentials: 'secret-ciphertext',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const [settings] = await service.listSettings('tenant-1');

    expect(settings).not.toHaveProperty('encryptedCredentials');
    expect(JSON.stringify(settings)).not.toContain('secret-ciphertext');
  });

  it('allows only safe local status transitions', async () => {
    const { service, repos } = makeService();
    repos.releases.findOne.mockResolvedValue({
      id: 'release-1',
      tenantId: 'tenant-1',
      status: 'DRAFT',
    });
    repos.releases.save.mockImplementation(
      async (value) => value as { id: string } & object,
    );

    const result = await service.updateStatus('tenant-1', actor, 'release-1', {
      status: 'QUEUED',
    });

    expect(result.status).toBe('QUEUED');
    expect(repos.events.save).toHaveBeenCalled();
  });
});
