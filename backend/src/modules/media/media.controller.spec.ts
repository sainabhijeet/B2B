import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { MediaFileTypeFilter } from './dto/list-media.dto';
import { MediaFoldersService } from './media-folders.service';
import { MediaController } from './media.controller';
import { MediaLifecycleService } from './media-lifecycle.service';
import { MediaService } from './media.service';

const mediaResponse = {
  id: 'bd53309f-e10b-46c6-8f29-8d715767f971',
  objectKey: 'tenant-media/logo.png',
  filename: 'logo.png',
  originalName: 'logo.png',
  mimeType: 'image/png',
  sizeBytes: '123',
  fileType: MediaFileTypeFilter.IMAGE,
  category: 'tenant_media',
  module: 'Tenant media',
  ownershipType: 'TENANT',
  tenantId: 'd884c47f-dc50-4a75-ae43-f5dc13f7ac81',
  providerId: null,
  provider: null,
  folderId: null,
  folderName: null,
  status: 'ACTIVE',
  scanRequired: false,
  scanStatus: 'NOT_REQUIRED',
  createdAt: null,
  updatedAt: null,
};

const request = {
  user: {
    sub: '6f49c71f-92b8-4f42-b618-aa3f5f9ec33e',
    role: UserRole.SUPER_ADMIN,
    tenantId: null,
  },
} as any;

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: jest.Mocked<
    Pick<MediaService, 'list' | 'getById' | 'upload'>
  >;
  let foldersService: jest.Mocked<Pick<MediaFoldersService, 'moveMedia'>>;
  let lifecycleService: jest.Mocked<
    Pick<
      MediaLifecycleService,
      'delete' | 'restore' | 'bulkDelete' | 'bulkRestore'
    >
  >;

  beforeEach(() => {
    mediaService = {
      list: jest.fn(),
      getById: jest.fn(),
      upload: jest.fn(),
    };
    foldersService = {
      moveMedia: jest.fn(),
    };
    lifecycleService = {
      delete: jest.fn(),
      restore: jest.fn(),
      bulkDelete: jest.fn(),
      bulkRestore: jest.fn(),
    };
    controller = new MediaController(
      mediaService as unknown as MediaService,
      foldersService as unknown as MediaFoldersService,
      lifecycleService as unknown as MediaLifecycleService,
    );
  });

  it('requires JWT and SUPER_ADMIN role at controller level', () => {
    const guards = Reflect.getMetadata('__guards__', MediaController) ?? [];
    const roles = Reflect.getMetadata(ROLES_KEY, MediaController);

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(roles).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('delegates list queries to the media service', async () => {
    const response = {
      items: [],
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    mediaService.list.mockResolvedValue(response);

    await expect(controller.list({ search: 'logo' })).resolves.toBe(response);
    expect(mediaService.list).toHaveBeenCalledWith({ search: 'logo' });
  });

  it('delegates item lookup to the media service', async () => {
    mediaService.getById.mockResolvedValue(mediaResponse);

    await expect(controller.getById(mediaResponse.id)).resolves.toBe(
      mediaResponse,
    );
    expect(mediaService.getById).toHaveBeenCalledWith(mediaResponse.id);
  });

  it('delegates uploads to the media service using the authenticated actor', async () => {
    const file = { originalname: 'logo.png' } as Express.Multer.File;
    mediaService.upload.mockResolvedValue(mediaResponse);

    await expect(controller.upload(file, request)).resolves.toBe(mediaResponse);
    expect(mediaService.upload).toHaveBeenCalledWith(file, request.user);
  });

  it('moves media to a folder using the authenticated actor', async () => {
    foldersService.moveMedia.mockResolvedValue({ id: mediaResponse.id } as any);
    mediaService.getById.mockResolvedValue(mediaResponse);

    await expect(
      controller.moveToFolder(
        mediaResponse.id,
        { folderId: '7a5a5a44-5555-4555-9555-555555555555' },
        request,
      ),
    ).resolves.toBe(mediaResponse);
    expect(foldersService.moveMedia).toHaveBeenCalledWith(
      mediaResponse.id,
      { folderId: '7a5a5a44-5555-4555-9555-555555555555' },
      request.user,
    );
  });
});
