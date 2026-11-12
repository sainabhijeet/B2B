import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AddStorageObjectsRegistryPhase3C1712600172200 } from '../../database/migrations/1712600172200-AddStorageObjectsRegistryPhase3C';
import { StorageObjectsService } from './storage-objects.service';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const objectId = '44444444-4444-4444-8444-444444444444';
const providerId = '55555555-5555-4555-8555-555555555555';

const superAdmin: JwtUserPayload = {
  sub: userId,
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

const ownerA: JwtUserPayload = {
  sub: userId,
  role: UserRole.OWNER,
  tenantId: tenantA,
};

const customerA: JwtUserPayload = {
  sub: userId,
  role: UserRole.CUSTOMER,
  tenantId: tenantA,
  customerId: '66666666-6666-4666-8666-666666666666',
};

function storageObject(overrides: Partial<StorageObject> = {}): StorageObject {
  return {
    id: objectId,
    tenantId: tenantA,
    tenant: null,
    providerId: null,
    provider: null,
    folderId: null,
    folder: null,
    objectKey: 'tenant-a/products/image.png',
    originalFilename: 'image.png',
    mimeType: 'image/png',
    sizeBytes: '128',
    checksumSha256:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ownershipType: 'TENANT',
    objectCategory: 'product_image',
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
    metadata: { source: 'test' },
    createdBy: userId,
    updatedBy: userId,
    createdAt: new Date('2026-09-09T00:00:00.000Z'),
    updatedAt: new Date('2026-09-09T00:00:00.000Z'),
    ...overrides,
  };
}

function makeService(
  options: {
    existingObject?: StorageObject | null;
    provider?: Partial<PlatformStorageProvider> | null;
    saveError?: unknown;
  } = {},
) {
  const objectRepository = {
    create: jest.fn((input) =>
      storageObject({
        ...input,
        id: objectId,
        createdAt: new Date('2026-09-09T00:00:00.000Z'),
        updatedAt: new Date('2026-09-09T00:00:00.000Z'),
      }),
    ),
    findOne: jest.fn().mockResolvedValue(options.existingObject ?? null),
    save: jest.fn(async (row: StorageObject) => {
      if (options.saveError) throw options.saveError;
      return row;
    }),
  };
  const providerRepository = {
    findOne: jest.fn().mockResolvedValue(
      options.provider === null
        ? null
        : {
            id: providerId,
            status: 'active',
            ...options.provider,
          },
    ),
  };

  return {
    objectRepository,
    providerRepository,
    service: new StorageObjectsService(
      objectRepository as never,
      providerRepository as never,
    ),
  };
}

describe('StorageObjectsService', () => {
  it('registers platform-owned objects for SUPER_ADMIN only', async () => {
    const { service } = makeService();

    const response = await service.registerPlatformObject(
      {
        objectKey: 'platform/theme-artifact.zip',
        objectCategory: 'theme_artifact',
        sizeBytes: 42,
      },
      superAdmin,
    );

    expect(response.ownershipType).toBe('PLATFORM');
    expect(response.tenantId).toBeNull();
    expect(response.accessScope).toBe('PLATFORM_PRIVATE');
  });

  it('registers tenant-owned objects using authenticated tenant context', async () => {
    const { service } = makeService();

    const response = await service.registerTenantObject(
      {
        objectKey: 'uploads/product.png',
        objectCategory: 'product_image',
        accessScope: 'PUBLIC_METADATA',
      },
      ownerA,
    );

    expect(response.ownershipType).toBe('TENANT');
    expect(response.tenantId).toBe(tenantA);
    expect(response.accessScope).toBe('PUBLIC_METADATA');
  });

  it('rejects tenant registration without valid tenant context', async () => {
    const { service } = makeService();

    await expect(
      service.registerTenantObject(
        { objectKey: 'uploads/product.png', objectCategory: 'product_image' },
        superAdmin,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents tenant A from reading tenant B objects', async () => {
    const { service } = makeService({
      existingObject: storageObject({ tenantId: tenantB }),
    });

    await expect(service.lookupObject(objectId, ownerA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('prevents tenants from reading platform-private objects', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        tenantId: null,
        ownershipType: 'PLATFORM',
        accessScope: 'PLATFORM_PRIVATE',
      }),
    });

    await expect(service.lookupObject(objectId, ownerA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows SUPER_ADMIN to read platform-owned objects', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        tenantId: null,
        ownershipType: 'PLATFORM',
        accessScope: 'PLATFORM_PRIVATE',
      }),
    });

    const response = await service.lookupObject(objectId, superAdmin);

    expect(response.ownershipType).toBe('PLATFORM');
  });

  it('allows a customer to read only their own customer avatar object', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        objectCategory: 'customer_avatar',
        metadata: { customerId: customerA.customerId },
      }),
    });

    const response = await service.lookupObject(objectId, customerA);

    expect(response.objectCategory).toBe('customer_avatar');
  });

  it('prevents a customer from reading another customer avatar in the same tenant', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        objectCategory: 'customer_avatar',
        metadata: { customerId: '77777777-7777-4777-8777-777777777777' },
      }),
    });

    await expect(
      service.lookupObject(objectId, customerA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a customer to read only their own payment proof object', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        objectCategory: 'payment_proof',
        metadata: { customerId: customerA.customerId, orderId: objectId },
      }),
    });

    const response = await service.lookupObject(objectId, customerA);

    expect(response.objectCategory).toBe('payment_proof');
  });

  it('prevents a customer from reading another customer payment proof in the same tenant', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        objectCategory: 'payment_proof',
        metadata: {
          customerId: '77777777-7777-4777-8777-777777777777',
          orderId: objectId,
        },
      }),
    });

    await expect(
      service.lookupObject(objectId, customerA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('registers quarantined tenant payment proof objects for scanning', async () => {
    const { service } = makeService();

    const response = await service.registerQuarantinedTenantObjectForTenant(
      tenantA,
      objectId,
      {
        objectKey: 'payment-proofs/tenant/order/proof.png',
        objectCategory: 'payment_proof',
        accessScope: 'TENANT_PRIVATE',
        metadata: { customerId: customerA.customerId, orderId: objectId },
      },
      ownerA,
    );

    expect(response.ownershipType).toBe('TENANT');
    expect(response.tenantId).toBe(tenantA);
    expect(response.status).toBe('QUARANTINED');
    expect(response.scanRequired).toBe(true);
    expect(response.scanStatus).toBe('QUARANTINED');
  });
  it('prevents customer users from mutating tenant objects', async () => {
    const { service } = makeService({
      existingObject: storageObject({ tenantId: tenantA }),
    });

    await expect(
      service.markDeleted(objectId, customerA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    '../outside.png',
    'tenant/../../outside.png',
    '/absolute.png',
    'C:/absolute.png',
    'tenant\\windows.png',
    'tenant//blank.png',
    'tenant/./dot.png',
    'tenant/%00.png\0',
  ])('rejects unsafe object key %s', async (objectKey) => {
    const { service } = makeService();

    await expect(
      service.registerTenantObject(
        { objectKey, objectCategory: 'product_image' },
        ownerA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turns duplicate active object keys into a safe conflict error', async () => {
    const { service } = makeService({ saveError: { code: '23505' } });

    await expect(
      service.registerTenantObject(
        { objectKey: 'uploads/product.png', objectCategory: 'product_image' },
        ownerA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects provider ownership mismatches when provider is missing or inactive', async () => {
    const { service } = makeService({
      provider: { id: providerId, status: 'inactive' },
    });

    await expect(
      service.registerTenantObject(
        {
          providerId,
          objectKey: 'uploads/product.png',
          objectCategory: 'product_image',
        },
        ownerA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow secrets or signed URLs in object metadata', async () => {
    const { service } = makeService();

    await expect(
      service.registerTenantObject(
        {
          objectKey: 'uploads/product.png',
          objectCategory: 'product_image',
          metadata: { signedUrl: 'https://example.com/private?token=secret' },
        },
        ownerA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('serializes safe metadata without provider credentials or filesystem roots', async () => {
    const { service } = makeService({
      existingObject: storageObject({
        metadata: { variantId: 'sku-1' },
        providerId,
      }),
    });

    const response = await service.lookupObject(objectId, ownerA);
    const serialized = JSON.stringify(response);

    expect(response.providerId).toBe(providerId);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('accessKey');
    expect(serialized).not.toContain('C:\\');
  });

  it('defines the dedicated Phase 3 migration and storage object indexes', () => {
    const migration = new AddStorageObjectsRegistryPhase3C1712600172200();

    expect(migration.name).toBe(
      'AddStorageObjectsRegistryPhase3C1712600172200',
    );
    expect(migration.up.toString()).toContain(
      'CREATE TABLE IF NOT EXISTS "storage_objects"',
    );
    expect(migration.up.toString()).toContain(
      'UQ_storage_objects_tenant_active_key',
    );
    expect(migration.up.toString()).toContain(
      'UQ_storage_objects_platform_active_key',
    );
  });
});
