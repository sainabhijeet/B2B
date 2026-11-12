import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { MediaFoldersService } from './media-folders.service';

const actor = {
  sub: '6f49c71f-92b8-4f42-b618-aa3f5f9ec33e',
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

const folder = {
  id: '7a5a5a44-5555-4555-9555-555555555555',
  name: 'Products',
  parentId: null,
  ownershipType: 'PLATFORM',
  tenantId: null,
  createdBy: actor.sub,
  updatedBy: actor.sub,
  createdAt: new Date('2026-08-24T10:00:00.000Z'),
  updatedAt: new Date('2026-08-24T10:00:00.000Z'),
};

const media = {
  id: 'bd53309f-e10b-46c6-8f29-8d715767f971',
  ownershipType: 'PLATFORM',
  tenantId: null,
  status: 'ACTIVE',
  folderId: null,
  updatedBy: null,
};

function qb(exists = false) {
  const query: any = {
    where: jest.fn(() => query),
    andWhere: jest.fn(() => query),
    getExists: jest.fn(async () => exists),
  };
  return query;
}

function createService(
  options: {
    duplicate?: boolean;
    childCount?: number;
    mediaCount?: number;
    folderRow?: any;
    mediaRow?: any;
  } = {},
) {
  const folderRepo = {
    find: jest.fn(async () => [folder]),
    findOne: jest.fn(async () => options.folderRow ?? folder),
    count: jest.fn(async () => options.childCount ?? 0),
    create: jest.fn((input) => ({
      ...input,
      id: folder.id,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })),
    save: jest.fn(async (input) => ({ ...folder, ...input })),
    remove: jest.fn(async () => folder),
    createQueryBuilder: jest.fn(() => qb(options.duplicate)),
  };
  const objectRepo = {
    count: jest.fn(async () => options.mediaCount ?? 0),
    findOne: jest.fn(async () => options.mediaRow ?? media),
    update: jest.fn(async (_criteria, partial) => ({ affected: 1, partial })),
    findOneOrFail: jest.fn(async () => ({
      ...(options.mediaRow ?? media),
      folderId: folder.id,
      folder,
    })),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => []),
    })),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity.name === 'MediaFolder') return folderRepo;
      return objectRepo;
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  return {
    service: new MediaFoldersService(
      folderRepo as any,
      objectRepo as any,
      dataSource as any,
    ),
    folderRepo,
    objectRepo,
  };
}

describe('MediaFoldersService', () => {
  it('creates platform folders without accepting tenant ownership from clients', async () => {
    const { service, folderRepo } = createService();

    const result = await service.create(
      { name: ' Products ', parentId: null },
      actor,
    );

    expect(folderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Products',
        parentId: null,
        ownershipType: 'PLATFORM',
        tenantId: null,
        createdBy: actor.sub,
      }),
    );
    expect(result.name).toBe('Products');
    expect(result.tenantId).toBeNull();
  });

  it('rejects duplicate sibling folder names', async () => {
    const { service } = createService({ duplicate: true });

    await expect(
      service.create({ name: 'Products' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unsafe folder names', async () => {
    const { service } = createService();

    await expect(
      service.create({ name: '../evil' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects folder deletion when child folders or active media exist', async () => {
    await expect(
      createService({ childCount: 1 }).service.delete(folder.id, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      createService({ mediaCount: 1 }).service.delete(folder.id, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('moves only active platform media to platform folders', async () => {
    const { service, objectRepo } = createService();

    const result = await service.moveMedia(
      media.id,
      { folderId: folder.id },
      actor,
    );

    expect(result.folderId).toBe(folder.id);
    expect(objectRepo.update).toHaveBeenCalledWith(
      { id: media.id },
      expect.objectContaining({ folderId: folder.id, updatedBy: actor.sub }),
    );
  });

  it('replaces an existing child folder assignment when moving media to a parent folder', async () => {
    const childFolder = {
      ...folder,
      id: '58f93aa9-3c54-43e4-aa84-111111111111',
      name: 'Images',
      parentId: folder.id,
    };
    const { service, objectRepo } = createService({
      mediaRow: { ...media, folderId: childFolder.id, folder: childFolder },
    });

    objectRepo.findOneOrFail.mockResolvedValueOnce({
      ...media,
      folderId: folder.id,
      folder,
    });

    const result = await service.moveMedia(
      media.id,
      { folderId: folder.id },
      actor,
    );

    expect(objectRepo.update).toHaveBeenCalledWith(
      { id: media.id },
      expect.objectContaining({ folderId: folder.id }),
    );
    expect(result.folderId).toBe(folder.id);
    expect(result.folder?.name).toBe(folder.name);
  });
  it('rejects tenant media folder moves', async () => {
    const { service } = createService({
      mediaRow: {
        ...media,
        ownershipType: 'TENANT',
        tenantId: 'd884c47f-dc50-4a75-ae43-f5dc13f7ac81',
      },
    });

    await expect(
      service.moveMedia(media.id, { folderId: folder.id }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
