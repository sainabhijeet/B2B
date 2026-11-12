import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { PlatformStorageRuntimeService } from './platform-storage-runtime.service';
import { StorageObjectDeliveryService } from './storage-object-delivery.service';
import { StorageObjectSignedAccessService } from './storage-object-signed-access.service';
import { StorageObjectsService } from './storage-objects.service';
import { PlatformStorageAdapter } from './storage-runtime.types';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const objectId = '44444444-4444-4444-8444-444444444444';
const objectIdB = '55555555-5555-4555-8555-555555555555';
const providerId = '66666666-6666-4666-8666-666666666666';
const jwtSecret = 'storage-delivery-test-secret-'.repeat(2);

const ownerA: JwtUserPayload = {
  sub: userId,
  role: UserRole.OWNER,
  tenantId: tenantA,
};

const ownerB: JwtUserPayload = {
  sub: userId,
  role: UserRole.OWNER,
  tenantId: tenantB,
};

const superAdmin: JwtUserPayload = {
  sub: userId,
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

const customerA: JwtUserPayload = {
  sub: userId,
  role: UserRole.CUSTOMER,
  tenantId: tenantA,
  customerId: '77777777-7777-4777-8777-777777777777',
};

function storageObject(overrides: Partial<StorageObject> = {}): StorageObject {
  return {
    id: objectId,
    tenantId: tenantA,
    tenant: null,
    providerId,
    provider: null,
    folderId: null,
    folder: null,
    objectKey: 'tenant-media/11111111-1111-4111-8111-111111111111/logo.png',
    originalFilename: 'logo.png',
    mimeType: 'image/png',
    sizeBytes: '4',
    checksumSha256: null,
    ownershipType: 'TENANT',
    objectCategory: 'tenant_media',
    accessScope: 'TENANT_PRIVATE',
    status: 'ACTIVE',
    scanRequired: false,
    scanStatus: 'NOT_REQUIRED',
    scannerProvider: null,
    scannerVerdict: null,
    scanStartedAt: null,
    scannedAt: null,
    scannerErrorCode: null,
    scanAttempts: 0,
    deletedAt: null,
    metadata: {},
    createdBy: userId,
    updatedBy: userId,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
    ...overrides,
  };
}

function makeAdapter(): PlatformStorageAdapter {
  return {
    type: 'LOCAL',
    publicBaseUrl: null,
    put: jest.fn(),
    head: jest.fn().mockResolvedValue({
      key: 'tenant-media/logo.png',
      contentLength: 4,
      contentType: null,
      etag: null,
      lastModified: new Date('2026-09-09T00:00:00.000Z'),
    }),
    getStream: jest.fn().mockResolvedValue(Readable.from(['data'])),
    exists: jest.fn(),
    delete: jest.fn(),
    healthCheck: jest.fn(),
  } as PlatformStorageAdapter;
}

function makeService(object: StorageObject, adapter = makeAdapter()) {
  const objectRepository = {
    findOne: jest
      .fn()
      .mockImplementation(({ where }: { where: { id: string } }) =>
        where.id === object.id
          ? Promise.resolve(object)
          : Promise.resolve(null),
      ),
  };
  const providerRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: providerId,
      status: 'active',
    } as PlatformStorageProvider),
  };
  const storageObjects = new StorageObjectsService(
    objectRepository as never,
    providerRepository as never,
  );
  const signedAccess = new StorageObjectSignedAccessService({
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'jwt.accessSecret') return jwtSecret;
      if (key === 'apiPrefix') return 'api/v1';
      return fallback;
    }),
  } as unknown as ConfigService);
  const runtime = {
    resolveProvider: jest.fn().mockResolvedValue({
      metadata: { providerId },
      adapter,
    }),
  } as unknown as PlatformStorageRuntimeService;
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'apiPrefix' ? 'api/v1' : fallback,
    ),
  } as unknown as ConfigService;
  return {
    adapter,
    objectRepository,
    runtime,
    signedAccess,
    service: new StorageObjectDeliveryService(
      objectRepository as never,
      storageObjects,
      signedAccess,
      runtime,
      config,
    ),
  };
}

describe('StorageObjectDeliveryService', () => {
  it('allows Tenant A to read its own registry-backed object', async () => {
    const { service } = makeService(storageObject());

    const result = await service.openReadStream({ objectId, actor: ownerA });

    expect(result.signed).toBe(false);
    expect(result.contentType).toBe('image/png');
    expect(result.contentDisposition).toBe('inline; filename="logo.png"');
  });

  it('prevents Tenant A from reading Tenant B objects', async () => {
    const { service } = makeService(storageObject({ tenantId: tenantB }));

    await expect(
      service.openReadStream({ objectId, actor: ownerA }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents tenant users from reading platform-private objects', async () => {
    const { service } = makeService(
      storageObject({
        tenantId: null,
        ownershipType: 'PLATFORM',
        accessScope: 'PLATFORM_PRIVATE',
      }),
    );

    await expect(
      service.openReadStream({ objectId, actor: ownerA }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows SUPER_ADMIN to read platform-private objects', async () => {
    const { service } = makeService(
      storageObject({
        tenantId: null,
        ownershipType: 'PLATFORM',
        accessScope: 'PLATFORM_PRIVATE',
      }),
    );

    await expect(
      service.openReadStream({ objectId, actor: superAdmin }),
    ).resolves.toMatchObject({ signed: false });
  });

  it('rejects unauthenticated private access without a signed token', async () => {
    const { service } = makeService(storageObject());

    await expect(service.openReadStream({ objectId })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows valid signed READ access without an authenticated user', async () => {
    const object = storageObject();
    const { service } = makeService(object);
    const access = await service.createSignedReadAccess(objectId, ownerA);

    const result = await service.openReadStream({
      objectId,
      token: access.token,
    });

    expect(result.signed).toBe(true);
    expect(access.url).toContain(`/api/v1/storage-objects/${objectId}/content`);
    expect(access.url).not.toContain(jwtSecret);
  });

  it('rejects expired signed access', async () => {
    const object = storageObject();
    const { service } = makeService(object);
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const access = await service.createSignedReadAccess(objectId, ownerA);
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000 + 301_000);

    await expect(
      service.openReadStream({ objectId, token: access.token }),
    ).rejects.toBeInstanceOf(BadRequestException);
    jest.restoreAllMocks();
  });

  it('rejects modified signatures', async () => {
    const object = storageObject();
    const { service } = makeService(object);
    const access = await service.createSignedReadAccess(objectId, ownerA);

    await expect(
      service.openReadStream({
        objectId,
        token: `${access.token.slice(0, -1)}x`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects signed tokens used for the wrong object id', async () => {
    const { signedAccess, service } = makeService(
      storageObject({ id: objectIdB }),
    );
    const token = signedAccess.createReadAccess(
      new StorageObjectsService({} as never, {} as never).toSafeMetadata(
        storageObject({ id: objectId }),
      ),
    ).token;

    await expect(
      service.openReadStream({ objectId: objectIdB, token }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed signed tokens', async () => {
    const { service } = makeService(storageObject());

    await expect(
      service.openReadStream({ objectId, token: 'malformed' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['QUARANTINED', 'QUARANTINED'],
    ['QUARANTINED', 'SCANNING'],
    ['QUARANTINED', 'INFECTED'],
    ['QUARANTINED', 'SCAN_FAILED'],
    ['QUARANTINED', 'CLEAN'],
    ['ACTIVE', 'SCANNING'],
  ] as const)(
    'denies signed access and delivery for unsafe malware scan states: %s/%s',
    async (status, scanStatus) => {
      const { service } = makeService(
        storageObject({ status, scanRequired: true, scanStatus }),
      );
      await expect(
        service.createSignedReadAccess(objectId, ownerA),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.openReadStream({ objectId, actor: ownerA }),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('allows ACTIVE and CLEAN scan-required objects', async () => {
    const { service } = makeService(
      storageObject({
        status: 'ACTIVE',
        scanRequired: true,
        scanStatus: 'CLEAN',
      }),
    );
    await expect(
      service.createSignedReadAccess(objectId, ownerA),
    ).resolves.toMatchObject({ objectId });
  });

  it('rejects deleted or inactive objects', async () => {
    const { service } = makeService(
      storageObject({ status: 'DELETED', deletedAt: new Date() }),
    );

    await expect(
      service.openReadStream({ objectId, actor: ownerA }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not allow customer users to mint signed access for platform-private objects', async () => {
    const { service } = makeService(
      storageObject({
        tenantId: null,
        ownershipType: 'PLATFORM',
        accessScope: 'PLATFORM_PRIVATE',
      }),
    );

    await expect(
      service.createSignedReadAccess(objectId, customerA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails safely when a provider-backed object provider is unavailable', async () => {
    const runtime = makeService(storageObject()).runtime as unknown as {
      resolveProvider: jest.Mock;
    };
    runtime.resolveProvider.mockResolvedValueOnce({
      metadata: { providerId: '99999999-9999-4999-8999-999999999999' },
      adapter: makeAdapter(),
    });
    const { service } = makeService(storageObject(), makeAdapter());
    (service as unknown as { runtime: typeof runtime }).runtime = runtime;

    await expect(
      service.openReadStream({ objectId, actor: ownerA }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not expose filesystem paths or credentials when content is unavailable', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter, 'head').mockRejectedValueOnce(new Error('C:\\secret'));
    const { service } = makeService(storageObject(), adapter);

    await expect(
      service.openReadStream({ objectId, actor: ownerA }),
    ).rejects.toMatchObject({
      message: 'Storage object content is unavailable.',
    });
  });

  it('sanitizes content type and disposition headers from registry metadata', async () => {
    const { service } = makeService(
      storageObject({
        mimeType: 'text/plain\r\nInjected: true',
        originalFilename: '..\\evil\r\nname.txt',
      }),
    );

    const result = await service.openReadStream({ objectId, actor: ownerA });

    expect(result.contentType).toBe('application/octet-stream');
    expect(result.contentDisposition).not.toContain('\r');
    expect(result.contentDisposition).not.toContain('\n');
    expect(result.contentDisposition).not.toContain('\\');
  });
});
