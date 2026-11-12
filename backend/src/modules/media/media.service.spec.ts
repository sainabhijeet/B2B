import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import {
  MediaFileTypeFilter,
  MediaSortOption,
  MediaStatusFilter,
} from './dto/list-media.dto';
import { MediaService } from './media.service';

const provider = {
  id: 'a15db01d-84f0-43df-bcb1-dff966d88bb4',
  name: 'Local Storage',
  type: 'LOCAL',
  credentials: { accessKey: 'secret' },
};

const activeImage = {
  id: 'bd53309f-e10b-46c6-8f29-8d715767f971',
  provider,
  providerId: provider.id,
  tenantId: 'd884c47f-dc50-4a75-ae43-f5dc13f7ac81',
  ownershipType: 'TENANT',
  objectKey: 'tenant-media/logo.png',
  objectCategory: 'tenant_media',
  originalFilename: 'logo.png',
  mimeType: 'image/png',
  sizeBytes: '42',
  status: 'ACTIVE',
  metadata: {
    access_token: 'must-not-appear',
    localPath: 'C:\\private\\storage\\logo.png',
  },
  createdAt: new Date('2026-08-24T10:00:00.000Z'),
  updatedAt: new Date('2026-08-24T10:01:00.000Z'),
};

const uploadedImage = {
  ...activeImage,
  id: '1fddc8bd-09fc-49a3-a6f4-9658c91b4c9a',
  tenantId: null,
  ownershipType: 'PLATFORM',
  objectKey: 'media-library/2026-08-24/uploaded-logo.png',
  objectCategory: 'media_library',
  originalFilename: 'uploaded-logo.png',
  mimeType: 'image/png',
  sizeBytes: '24',
};

const actor: JwtUserPayload = {
  sub: '6f49c71f-92b8-4f42-b618-aa3f5f9ec33e',
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);

function multerFile(name = 'uploaded-logo.png'): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: 'image/png',
    size: png.length,
    buffer: png,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  };
}

const createQueryBuilder = (rows = [activeImage], total = rows.length) => {
  const qb: any = {
    leftJoinAndSelect: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getManyAndCount: jest.fn(async () => [rows, total]),
  };
  return qb;
};

const validatedUpload = {
  category: 'media_library',
  filename: 'uploaded-logo.png',
  extension: '.png',
  declaredMimeType: 'image/png',
  detectedMimeType: 'image/png',
  sizeBytes: png.length,
  objectKey: null,
  warnings: [],
};

const createService = (
  qb = createQueryBuilder(),
  findOneResult: any = activeImage,
) => {
  const repository = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(async () => findOneResult),
    update: jest.fn(async () => ({ affected: 1 })),
  };

  const mediaFolders = {
    findOne: jest.fn(async () => ({
      id: '7a5a5a44-5555-4555-9555-555555555555',
    })),
  };
  const adapter = {
    put: jest.fn(async () => ({
      key: 'media-library/2026-08-24/uploaded-logo.png',
      contentLength: png.length,
      contentType: 'image/png',
      etag: null,
      lastModified: new Date(),
    })),
    delete: jest.fn(async () => undefined),
  };
  const uploadValidation = {
    validateFileOrThrow: jest.fn(() => validatedUpload),
  };
  const storageRuntime = {
    resolveProvider: jest.fn(async () => ({
      metadata: {
        source: 'db',
        providerId: provider.id,
      },
      adapter,
    })),
  };
  const storageObjectRegistry = {
    registerPlatformObject: jest.fn(async () => ({ id: uploadedImage.id })),
    registerQuarantinedPlatformObject: jest.fn(async (id: string) => ({ id })),
  };
  const auditLogs = { save: jest.fn(async (value) => value) };
  const quarantine = {
    write: jest.fn(async () => ({ sizeBytes: png.length })),
    delete: jest.fn(async () => undefined),
  };
  const scanQueue = { enqueue: jest.fn(async () => undefined) };
  const config = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  };

  return {
    service: new MediaService(
      repository as any,
      mediaFolders as any,
      auditLogs as any,
      uploadValidation as any,
      storageRuntime as any,
      storageObjectRegistry as any,
      quarantine as any,
      scanQueue as any,
      config as any,
    ),
    repository,
    mediaFolders,
    qb,
    adapter,
    uploadValidation,
    storageRuntime,
    storageObjectRegistry,
    auditLogs,
    quarantine,
    scanQueue,
    config,
  };
};

describe('MediaService', () => {
  it('lists ACTIVE media by default with safe pagination metadata', async () => {
    const { service, qb } = createService(
      createQueryBuilder([activeImage], 26),
    );

    const result = await service.list({ page: 2, limit: 10 });

    expect(qb.where).toHaveBeenCalledWith('media.status = :status', {
      status: MediaStatusFilter.ACTIVE,
    });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result.total).toBe(26);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('caps large limits at the server maximum', async () => {
    const { service, qb } = createService();

    const result = await service.list({ limit: 10_000 });

    expect(qb.take).toHaveBeenCalledWith(100);
    expect(result.limit).toBe(100);
  });

  it('maps registry rows to media responses without credentials, ciphertext, filesystem paths, or metadata secrets', async () => {
    const { service } = createService();

    const result = await service.list({});
    const serialized = JSON.stringify(result);

    expect(result.items[0]).toMatchObject({
      id: activeImage.id,
      objectKey: activeImage.objectKey,
      filename: 'logo.png',
      originalName: 'logo.png',
      mimeType: 'image/png',
      sizeBytes: '42',
      fileType: MediaFileTypeFilter.IMAGE,
      category: 'tenant_media',
      module: 'Tenant media',
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
      },
    });
    expect(serialized).not.toContain('access_token');
    expect(serialized).not.toContain('must-not-appear');
    expect(serialized).not.toContain('credentials');
    expect(serialized).not.toContain('C:\\private');
  });

  it('applies safe filter and sort clauses', async () => {
    const { service, qb } = createService();

    await service.list({
      search: 'logo_%',
      category: 'tenant_media',
      module: 'Tenant media',
      ownershipType: 'TENANT' as any,
      providerId: provider.id,
      tenantId: activeImage.tenantId,
      mimeType: 'image/png',
      status: MediaStatusFilter.DELETED,
      fileType: MediaFileTypeFilter.IMAGE,
      sort: MediaSortOption.NAME_ASC,
    });

    expect(qb.where).toHaveBeenCalledWith('media.status = :status', {
      status: MediaStatusFilter.DELETED,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'media.object_category = :category',
      { category: 'tenant_media' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'media.object_category IN (:...moduleCategories)',
      {
        moduleCategories: ['tenant_media'],
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'media.ownership_type = :ownershipType',
      {
        ownershipType: 'TENANT',
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'media.provider_id = :providerId',
      { providerId: provider.id },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('media.tenant_id = :tenantId', {
      tenantId: activeImage.tenantId,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('media.mime_type = :mimeType', {
      mimeType: 'image/png',
    });
    expect(qb.orderBy).toHaveBeenCalledWith(
      'media.originalFilename',
      'ASC',
      'NULLS LAST',
    );
  });

  it('filters by validated platform folder id and unfiled media', async () => {
    const { service, qb, mediaFolders } = createService();
    const folderId = '7a5a5a44-5555-4555-9555-555555555555';

    await service.list({ folderId, unfiled: true });

    expect(mediaFolders.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: folderId,
        ownershipType: 'PLATFORM',
      }),
      select: ['id'],
    });
    expect(qb.andWhere).toHaveBeenCalledWith('media.folder_id = :folderId', {
      folderId,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('media.folder_id IS NULL');
  });
  it('defaults unsafe sort input to created_at desc', async () => {
    const { service, qb } = createService();

    await service.list({
      sort: 'created_at;drop table storage_objects' as any,
    });

    expect(qb.orderBy).toHaveBeenCalledWith(
      'media.createdAt',
      'DESC',
      'NULLS LAST',
    );
  });
  it.each([
    [MediaSortOption.CREATED_AT_DESC, 'media.createdAt', 'DESC'],
    [MediaSortOption.CREATED_AT_ASC, 'media.createdAt', 'ASC'],
    [MediaSortOption.NAME_ASC, 'media.originalFilename', 'ASC'],
    [MediaSortOption.NAME_DESC, 'media.originalFilename', 'DESC'],
    [MediaSortOption.SIZE_ASC, 'media.sizeBytes', 'ASC'],
    [MediaSortOption.SIZE_DESC, 'media.sizeBytes', 'DESC'],
  ] as const)(
    'uses TypeORM property paths for %s sorting',
    async (sort, column, direction) => {
      const { service, qb } = createService();

      await service.list({ sort });

      expect(qb.orderBy).toHaveBeenCalledWith(column, direction, 'NULLS LAST');
    },
  );

  it('returns detail for an existing media object', async () => {
    const { service, repository } = createService(undefined, activeImage);

    const result = await service.getById(activeImage.id);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: activeImage.id },
      relations: { provider: true, folder: true },
    });
    expect(result.id).toBe(activeImage.id);
  });

  it('throws NotFoundException for missing detail records', async () => {
    const { service } = createService(undefined, null);

    await expect(service.getById(activeImage.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('uploads to quarantine, registers pending metadata, and enqueues exactly one scan', async () => {
    const context = createService(undefined, uploadedImage);
    const result = await context.service.upload(multerFile(), actor);
    expect(context.uploadValidation.validateFileOrThrow).toHaveBeenCalledTimes(
      2,
    );
    expect(context.quarantine.write).toHaveBeenCalledTimes(1);
    expect(context.adapter.put).not.toHaveBeenCalled();
    expect(
      context.storageObjectRegistry.registerQuarantinedPlatformObject,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        providerId: provider.id,
        objectCategory: 'media_library',
        checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      actor,
    );
    expect(context.scanQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(uploadedImage.id);
  });

  it('does not write or register when upload validation fails', async () => {
    const context = createService(undefined, uploadedImage);
    context.uploadValidation.validateFileOrThrow.mockImplementationOnce(() => {
      throw new BadRequestException('Upload validation failed.');
    });
    await expect(
      context.service.upload(multerFile('../evil.png'), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(context.quarantine.write).not.toHaveBeenCalled();
    expect(
      context.storageObjectRegistry.registerQuarantinedPlatformObject,
    ).not.toHaveBeenCalled();
  });

  it('cleans quarantine when registry registration fails', async () => {
    const context = createService(undefined, uploadedImage);
    context.storageObjectRegistry.registerQuarantinedPlatformObject.mockRejectedValueOnce(
      new Error('registry failed'),
    );
    await expect(context.service.upload(multerFile(), actor)).rejects.toThrow(
      'registry failed',
    );
    expect(context.quarantine.delete).toHaveBeenCalledTimes(1);
    expect(context.adapter.put).not.toHaveBeenCalled();
  });

  it('fails closed when the queue is unavailable', async () => {
    const context = createService(undefined, uploadedImage);
    context.scanQueue.enqueue.mockRejectedValueOnce(
      new Error('redis unavailable'),
    );
    await context.service.upload(multerFile(), actor);
    expect(context.repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'QUARANTINED' }),
      expect.objectContaining({
        scanStatus: 'SCAN_FAILED',
        scannerErrorCode: 'QUEUE_UNAVAILABLE',
      }),
    );
    expect(context.adapter.put).not.toHaveBeenCalled();
  });

  it('generates a unique object key for duplicate original filenames', async () => {
    const { service, storageObjectRegistry } = createService(
      undefined,
      uploadedImage,
    );

    await service.upload(multerFile('same.png'), actor);
    await service.upload(multerFile('same.png'), actor);

    const firstKey = (
      storageObjectRegistry.registerQuarantinedPlatformObject as jest.Mock
    ).mock.calls[0][1].objectKey;
    const secondKey = (
      storageObjectRegistry.registerQuarantinedPlatformObject as jest.Mock
    ).mock.calls[1][1].objectKey;
    expect(firstKey).not.toEqual(secondKey);
    expect(firstKey).toMatch(/^media-library\//);
    expect(secondKey).toMatch(/^media-library\//);
  });
});
