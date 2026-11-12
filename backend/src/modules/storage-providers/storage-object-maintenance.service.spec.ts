import { ForbiddenException } from '@nestjs/common';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';

let mockedStorageRoot = '';

jest.mock('../../common/utils/storage-root', () => ({
  getBackendStorageRoot: () => mockedStorageRoot,
}));

import { StorageObjectMaintenanceService } from './storage-object-maintenance.service';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const providerId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const superAdmin = {
  sub: 'admin',
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

const tenantActor = {
  sub: 'tenant-user',
  role: UserRole.OWNER,
  tenantId: tenantA,
};

function storageObject(overrides: Partial<StorageObject> = {}): StorageObject {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: tenantA,
    providerId,
    ownerScope: 'TENANT',
    objectKey: 'tenant-a/logo.png',
    originalFilename: 'logo.png',
    mimeType: 'image/png',
    sizeBytes: '4',
    checksumSha256: null,
    visibility: 'PRIVATE',
    status: 'ACTIVE',
    metadata: {},
    createdBy: 'user',
    createdAt: new Date('2026-09-10T00:00:00.000Z'),
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  } as StorageObject;
}

function makeService(objects: StorageObject[] = [storageObject()]) {
  const objectRepository = {
    find: jest.fn().mockResolvedValue(objects),
    findOne: jest.fn(({ where }: { where: { id?: string } }) =>
      Promise.resolve(objects.find((object) => object.id === where.id) ?? null),
    ),
    count: jest.fn(
      ({ where }: { where: { objectKey?: string; status?: string } }) =>
        Promise.resolve(
          objects.some(
            (object) =>
              object.objectKey === where.objectKey &&
              object.status === where.status,
          )
            ? 1
            : 0,
        ),
    ),
    save: jest.fn(async (input: StorageObject) => input),
  };
  const providerRepository = {
    findOne: jest.fn(({ where }: { where: { id?: string } }) =>
      Promise.resolve(
        where.id === providerId
          ? ({ id: providerId, status: 'active' } as PlatformStorageProvider)
          : null,
      ),
    ),
  };
  const storageObjects = {
    authorizeObjectAccess: jest.fn(
      async (object: StorageObject, actor: typeof tenantActor) => {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (object.tenantId !== actor.tenantId) {
          return Promise.reject(new ForbiddenException());
        }
      },
    ),
  };

  return {
    objectRepository,
    providerRepository,
    service: new StorageObjectMaintenanceService(
      objectRepository as never,
      providerRepository as never,
      storageObjects as never,
    ),
    storageObjects,
  };
}

describe('StorageObjectMaintenanceService', () => {
  beforeEach(async () => {
    mockedStorageRoot = await mkdtemp(
      path.join(tmpdir(), 'saas-storage-maintenance-'),
    );
  });

  afterEach(async () => {
    await rm(mockedStorageRoot, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('scopes tenant consistency scans to the authenticated tenant only', async () => {
    const { objectRepository, service } = makeService();

    await service.inspectRegistryConsistency(tenantActor);

    expect(objectRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: tenantA },
      }),
    );
  });

  it('reports invalid provider references without exposing credentials', async () => {
    const { providerRepository, service } = makeService([
      storageObject({ providerId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }),
    ]);
    providerRepository.findOne.mockResolvedValueOnce(null);

    const report = await service.inspectRegistryConsistency(superAdmin);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'INVALID_PROVIDER' }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain('secret');
  });

  it('detects local physical orphan files and keeps dry-run cleanup non-destructive', async () => {
    const orphanKey = 'orphans/file.txt';
    const orphanPath = path.join(mockedStorageRoot, 'orphans', 'file.txt');
    await mkdir(path.dirname(orphanPath), { recursive: true });
    await writeFile(orphanPath, 'orphan');
    const { service } = makeService([]);

    const report = await service.cleanupLocalOrphans({
      actor: superAdmin,
      prefix: 'orphans',
      dryRun: true,
    });

    expect(report.dryRun).toBe(true);
    expect(report.issues.map((issue) => issue.objectKey)).toEqual([orphanKey]);
    expect(report.deleted).toBe(0);
    await expect(readFile(orphanPath, 'utf8')).resolves.toBe('orphan');
  });

  it('does not physically delete provider-backed objects without an explicit migration plan', async () => {
    const { service } = makeService([storageObject()]);

    await expect(
      service.secureDelete({
        objectId: '11111111-1111-4111-8111-111111111111',
        actor: superAdmin,
        dryRun: false,
        deletePhysical: true,
      }),
    ).rejects.toThrow(/explicit migration plan/);
  });

  it('prevents one tenant from secure-deleting another tenant object', async () => {
    const { objectRepository, service } = makeService([
      storageObject({ tenantId: tenantB }),
    ]);

    await expect(
      service.secureDelete({
        objectId: '11111111-1111-4111-8111-111111111111',
        actor: tenantActor,
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(objectRepository.save).not.toHaveBeenCalled();
  });
});
