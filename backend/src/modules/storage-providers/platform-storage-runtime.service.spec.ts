import { BadRequestException } from '@nestjs/common';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { PlatformStorageRuntimeService } from './platform-storage-runtime.service';

function providerRow(
  overrides: Partial<PlatformStorageProvider> = {},
): PlatformStorageProvider {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Primary storage',
    type: 'S3_COMPATIBLE',
    status: 'active',
    isDefault: true,
    mode: 'LIVE',
    configuration: {
      endpoint: 'https://account.r2.cloudflarestorage.com',
      region: 'auto',
      bucketName: 'platform-assets',
      publicBaseUrl: 'https://cdn.example.com',
    },
    credentials: {
      accessKeyId: 'enc:v1:aes-256-gcm:access',
      secretAccessKey: 'enc:v1:aes-256-gcm:secret',
    },
    healthStatus: 'UNKNOWN',
    lastCheckedAt: null,
    lastSuccessfulCheckAt: null,
    lastFailedCheckAt: null,
    lastLatencyMs: null,
    healthMessage: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
    ...overrides,
  };
}

function makeService(options: {
  row?: PlatformStorageProvider | null;
  config?: Record<string, unknown>;
  encrypted?: boolean;
}) {
  const providerRepository = {
    findOne: jest.fn().mockResolvedValue(options.row ?? null),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) =>
      Object.prototype.hasOwnProperty.call(options.config ?? {}, key)
        ? options.config?.[key]
        : fallback,
    ),
  };
  const credentials = {
    isEncrypted: jest.fn(() => options.encrypted ?? true),
    decrypt: jest.fn((value: string) => `plain:${value}`),
  };
  return {
    configService,
    credentials,
    providerRepository,
    service: new PlatformStorageRuntimeService(
      providerRepository as never,
      configService as never,
      credentials as never,
      {
        assertResolvedEndpointSafe: jest.fn().mockResolvedValue(undefined),
      } as never,
    ),
  };
}

describe('PlatformStorageRuntimeService', () => {
  it('keeps local filesystem authoritative when the runtime feature flag is disabled', async () => {
    const { providerRepository, service } = makeService({
      row: providerRow(),
      config: { 'platformStorageRuntime.enabled': false },
    });

    const resolution = await service.resolveProvider();

    expect(resolution.metadata.source).toBe('local');
    expect(resolution.adapter.type).toBe('LOCAL');
    expect(resolution.metadata.runtimeEnabled).toBe(false);
    expect(resolution.metadata.warnings).toContain(
      'PLATFORM_STORAGE_RUNTIME_ENABLED is disabled; existing local filesystem runtime remains authoritative.',
    );
    expect(providerRepository.findOne).not.toHaveBeenCalled();
  });

  it('resolves the active default DB provider when runtime is enabled', async () => {
    const { credentials, providerRepository, service } = makeService({
      row: providerRow(),
      config: { 'platformStorageRuntime.enabled': true },
    });

    const resolution = await service.resolveProvider();

    expect(providerRepository.findOne).toHaveBeenCalledWith({
      where: { isDefault: true, status: 'active' },
      order: { updatedAt: 'DESC' },
    });
    expect(resolution.metadata.source).toBe('db');
    expect(resolution.metadata.type).toBe('S3_COMPATIBLE');
    expect(resolution.metadata.endpointHost).toBe(
      'account.r2.cloudflarestorage.com',
    );
    expect(JSON.stringify(resolution.metadata)).not.toContain('secret');
    expect(credentials.decrypt).toHaveBeenCalledTimes(2);
  });

  it('uses the existing R2 environment configuration before local fallback', async () => {
    const { service } = makeService({
      row: null,
      config: {
        'platformStorageRuntime.enabled': true,
        'r2.accountId': 'account-id',
        'r2.accessKeyId': 'env-access',
        'r2.secretAccessKey': 'env-secret',
        'r2.bucket': 'theme-artifacts',
        'r2.publicBaseUrl': 'https://cdn.example.com',
      },
    });

    const resolution = await service.resolveProvider();

    expect(resolution.metadata.source).toBe('env');
    expect(resolution.metadata.type).toBe('S3_COMPATIBLE');
    expect(resolution.metadata.bucketName).toBe('theme-artifacts');
    expect(JSON.stringify(resolution.metadata)).not.toContain('env-secret');
  });

  it('falls back to local filesystem when no active DB or env provider exists', async () => {
    const { service } = makeService({
      row: null,
      config: { 'platformStorageRuntime.enabled': true },
    });

    const resolution = await service.resolveProvider();

    expect(resolution.metadata.source).toBe('local');
    expect(resolution.adapter.type).toBe('LOCAL');
  });

  it('fails safely instead of marking an invalid S3 provider healthy', async () => {
    const { service } = makeService({
      row: providerRow({
        credentials: { accessKeyId: 'plain', secretAccessKey: 'plain' },
      }),
      config: { 'platformStorageRuntime.enabled': true },
      encrypted: false,
    });

    await expect(service.resolveProvider()).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns UNKNOWN health metadata before a real runtime health probe is executed', async () => {
    const { service } = makeService({
      row: providerRow({ healthStatus: 'UNKNOWN' }),
      config: { 'platformStorageRuntime.enabled': true },
    });

    const metadata = await service.getProviderMetadata();

    expect(metadata.healthStatus).toBe('UNKNOWN');
  });
});
