import { BadRequestException } from '@nestjs/common';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PlatformStorageProvidersService } from './platform-storage-providers.service';
import { StorageProviderAdapter } from './storage-provider.adapter';

const actor = {
  sub: '11111111-1111-1111-1111-111111111111',
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

function providerRow(
  overrides: Partial<PlatformStorageProvider> = {},
): PlatformStorageProvider {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Primary S3',
    type: 'S3_COMPATIBLE',
    status: 'active',
    isDefault: true,
    mode: 'LIVE',
    configuration: {
      endpoint: 'https://s3.example.com',
      region: 'auto',
      bucketName: 'platform-assets',
      publicBaseUrl: 'https://cdn.example.com',
    },
    credentials: {
      accessKeyId: 'enc:v1:aes-256-gcm:key-id',
      secretAccessKey: 'enc:v1:aes-256-gcm:key-secret',
    },
    healthStatus: 'UNKNOWN',
    lastCheckedAt: null,
    lastSuccessfulCheckAt: null,
    lastFailedCheckAt: null,
    lastLatencyMs: null,
    healthMessage: null,
    createdBy: actor.sub,
    updatedBy: actor.sub,
    createdAt: new Date('2026-09-08T00:00:00.000Z'),
    updatedAt: new Date('2026-09-08T00:00:00.000Z'),
    ...overrides,
  };
}

function makeService(row = providerRow()) {
  const auditRepo = { save: jest.fn() };
  const providerRepo = {
    find: jest.fn().mockResolvedValue([row]),
    findOne: jest.fn().mockResolvedValue(row),
    create: jest.fn((input) =>
      providerRow({
        ...input,
        id: '33333333-3333-3333-3333-333333333333',
      }),
    ),
    save: jest.fn(async (input) => input),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    manager: {
      transaction: jest.fn(async (fn) =>
        fn({
          getRepository: (entity: unknown) =>
            entity === AuditLog
              ? auditRepo
              : entity === StorageObject
                ? storageObjectRepo
                : providerRepo,
        }),
      ),
    },
  };
  const credentials = {
    isConfigured: jest.fn().mockReturnValue(true),
    isEncrypted: jest.fn((value: string | undefined) =>
      Boolean(value?.startsWith('enc:') || value?.startsWith('enc:v1:')),
    ),
    encrypt: jest.fn((value: string) => `enc:${value}`),
    decrypt: jest.fn((value: string) => `plain:${value}`),
  };
  const storageObjectRepo = {
    count: jest.fn().mockResolvedValue(0),
  };
  const endpointSecurity = {
    assertResolvedEndpointSafe: jest.fn().mockResolvedValue(undefined),
    parseSafeUrl: jest.fn((raw: string) => new URL(raw)),
  };
  const adapter = {
    testConnection: jest.fn().mockResolvedValue({
      ok: true,
      latencyMs: 14,
      message: 'S3-compatible bucket access verified.',
    }),
  };
  const service = new PlatformStorageProvidersService(
    providerRepo as never,
    credentials as never,
    adapter as unknown as StorageProviderAdapter,
    endpointSecurity as never,
  );
  return {
    adapter,
    auditRepo,
    credentials,
    providerRepo,
    service,
    storageObjectRepo,
    endpointSecurity,
  };
}

describe('PlatformStorageProvidersService', () => {
  it('lists providers without exposing encrypted credentials', async () => {
    const { service } = makeService();

    const [response] = await service.list();

    expect(response.name).toBe('Primary S3');
    expect(response.accessKeyIdConfigured).toBe(true);
    expect(response.secretAccessKeyConfigured).toBe(true);
    expect(JSON.stringify(response)).not.toContain('enc:v1');
    expect(JSON.stringify(response)).not.toContain('key-secret');
  });

  it('encrypts S3-compatible credentials and keeps secrets out of audit metadata', async () => {
    const { auditRepo, credentials, providerRepo, service } = makeService();
    providerRepo.findOne.mockResolvedValueOnce(null);

    const response = await service.create(
      {
        name: 'Cloudflare R2',
        type: 'S3_COMPATIBLE',
        mode: 'LIVE',
        endpoint: 'https://account-id.r2.cloudflarestorage.com',
        region: 'auto',
        bucketName: 'platform-assets',
        publicBaseUrl: 'https://cdn.example.com',
        accessKeyId: 'plain-access-key',
        secretAccessKey: 'plain-secret-key',
        isDefault: true,
      },
      actor,
    );

    expect(credentials.encrypt).toHaveBeenCalledWith('plain-access-key');
    expect(credentials.encrypt).toHaveBeenCalledWith('plain-secret-key');
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: {
          accessKeyId: 'enc:plain-access-key',
          secretAccessKey: 'enc:plain-secret-key',
        },
      }),
    );
    expect(response.accessKeyIdConfigured).toBe(true);
    expect(JSON.stringify(response)).not.toContain('plain-secret-key');
    expect(JSON.stringify(auditRepo.save.mock.calls)).not.toContain(
      'plain-secret-key',
    );
  });

  it('allows LOCAL providers without credentials or arbitrary filesystem paths', async () => {
    const { credentials, providerRepo, service } = makeService();
    providerRepo.findOne.mockResolvedValueOnce(null);

    const response = await service.create(
      {
        name: 'Local storage',
        type: 'LOCAL',
        publicBaseUrl: 'https://assets.example.com',
      },
      actor,
    );

    expect(credentials.encrypt).not.toHaveBeenCalled();
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOCAL',
        credentials: {},
      }),
    );
    expect(response.accessKeyIdConfigured).toBe(false);
  });

  it('rejects S3 endpoints targeting localhost or private IP literals', async () => {
    const { endpointSecurity, providerRepo, service } = makeService();
    providerRepo.findOne.mockResolvedValueOnce(null);
    endpointSecurity.assertResolvedEndpointSafe.mockRejectedValueOnce(
      new BadRequestException('S3-compatible storage endpoint is not allowed.'),
    );

    await expect(
      service.create(
        {
          name: 'Bad S3',
          type: 'S3_COMPATIBLE',
          endpoint: 'http://127.0.0.1:9000',
          region: 'auto',
          bucketName: 'platform-assets',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails safely instead of saving plaintext when encryption is unavailable', async () => {
    const { credentials, providerRepo, service } = makeService();
    credentials.isConfigured.mockReturnValueOnce(false);

    await expect(
      service.create(
        {
          name: 'S3',
          type: 'S3_COMPATIBLE',
          endpoint: 'https://s3.example.com',
          region: 'auto',
          bucketName: 'platform-assets',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(providerRepo.save).not.toHaveBeenCalled();
  });

  it('preserves encrypted S3 credentials when update omits credentials', async () => {
    const { credentials, providerRepo, service } = makeService();

    await service.update(
      '22222222-2222-2222-2222-222222222222',
      { name: 'Renamed S3' },
      actor,
    );

    expect(credentials.encrypt).not.toHaveBeenCalled();
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Renamed S3',
        credentials: {
          accessKeyId: 'enc:v1:aes-256-gcm:key-id',
          secretAccessKey: 'enc:v1:aes-256-gcm:key-secret',
        },
      }),
    );
  });

  it('prevents disabling the default storage provider', async () => {
    const { service } = makeService();

    await expect(
      service.disable('22222222-2222-2222-2222-222222222222', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an active provider before setting default', async () => {
    const { service } = makeService(providerRow({ status: 'inactive' }));

    await expect(
      service.setDefault('22222222-2222-2222-2222-222222222222', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records sanitized connection-test failures without exposing secrets', async () => {
    const { adapter, auditRepo, providerRepo, service } = makeService();
    adapter.testConnection.mockRejectedValueOnce(
      new Error('AccessDenied secretAccessKey=plain-secret Authorization abc'),
    );

    const result = await service.testConnection(
      '22222222-2222-2222-2222-222222222222',
      actor,
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Storage provider authentication failed.');
    expect(providerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        healthStatus: 'UNHEALTHY',
        healthMessage: 'Storage provider authentication failed.',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('plain-secret');
    expect(JSON.stringify(auditRepo.save.mock.calls)).not.toContain(
      'plain-secret',
    );
  });
  it('blocks provider deletion while active storage objects depend on it', async () => {
    const { providerRepo, service, storageObjectRepo } = makeService();
    storageObjectRepo.count.mockResolvedValueOnce(2);

    await expect(
      service.remove('22222222-2222-2222-2222-222222222222', actor),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(providerRepo.delete).not.toHaveBeenCalled();
  });
});
