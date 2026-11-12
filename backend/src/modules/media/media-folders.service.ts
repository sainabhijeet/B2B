import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MediaFolder } from '../../common/entities/media-folder.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import {
  CreateMediaFolderDto,
  MoveMediaFolderDto,
  UpdateMediaFolderDto,
} from './dto/media-folder.dto';
import { MediaFolderResponseDto } from './dto/media-folder-response.dto';

const MAX_FOLDER_DEPTH = 50;

@Injectable()
export class MediaFoldersService {
  constructor(
    @InjectRepository(MediaFolder)
    private readonly folders: Repository<MediaFolder>,
    @InjectRepository(StorageObject)
    private readonly storageObjects: Repository<StorageObject>,
    private readonly dataSource: DataSource,
  ) {}

  async list(actor: JwtUserPayload): Promise<MediaFolderResponseDto[]> {
    this.assertSuperAdmin(actor);
    const rows = await this.folders.find({
      where: { ownershipType: 'PLATFORM', tenantId: IsNull() },
      order: { name: 'ASC', createdAt: 'ASC' },
    });
    const counts = await this.mediaCounts(rows.map((row) => row.id));
    const byParent = new Map<string | null, MediaFolder[]>();
    for (const row of rows) {
      const key = row.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }

    const build = (
      parentId: string | null,
      depth: number,
    ): MediaFolderResponseDto[] => {
      if (depth > MAX_FOLDER_DEPTH) return [];
      return (byParent.get(parentId) ?? []).map((row) => ({
        ...this.toResponse(row, counts.get(row.id) ?? 0),
        children: build(row.id, depth + 1),
      }));
    };

    return build(null, 0);
  }

  async get(
    id: string,
    actor: JwtUserPayload,
  ): Promise<MediaFolderResponseDto> {
    this.assertSuperAdmin(actor);
    const row = await this.findPlatformFolderOrThrow(id);
    const counts = await this.mediaCounts([row.id]);
    return this.toResponse(row, counts.get(row.id) ?? 0);
  }

  async create(
    input: CreateMediaFolderDto,
    actor: JwtUserPayload,
  ): Promise<MediaFolderResponseDto> {
    this.assertSuperAdmin(actor);
    const name = this.normalizeName(input.name);
    const parentId = input.parentId ?? null;

    return this.dataSource.transaction(async (manager) => {
      const folderRepo = manager.getRepository(MediaFolder);
      if (parentId) {
        await this.findPlatformFolderOrThrow(parentId, folderRepo);
      }
      await this.assertSiblingNameAvailable(
        name,
        parentId,
        undefined,
        folderRepo,
      );
      const row = folderRepo.create({
        name,
        parentId,
        ownershipType: 'PLATFORM',
        tenantId: null,
        createdBy: actor.sub,
        updatedBy: actor.sub,
      });
      const saved = await this.saveOrConflict(row, folderRepo);
      return this.toResponse(saved, 0);
    });
  }

  async update(
    id: string,
    input: UpdateMediaFolderDto,
    actor: JwtUserPayload,
  ): Promise<MediaFolderResponseDto> {
    this.assertSuperAdmin(actor);
    return this.dataSource.transaction(async (manager) => {
      const folderRepo = manager.getRepository(MediaFolder);
      const row = await this.findPlatformFolderOrThrow(id, folderRepo);
      const nextName =
        input.name !== undefined ? this.normalizeName(input.name) : row.name;
      const nextParentId = Object.prototype.hasOwnProperty.call(
        input,
        'parentId',
      )
        ? (input.parentId ?? null)
        : row.parentId;

      if (nextParentId) {
        await this.assertValidParentMove(row.id, nextParentId, folderRepo);
      }
      if (nextParentId === row.id) {
        throw new BadRequestException('Folder cannot be its own parent.');
      }
      await this.assertSiblingNameAvailable(
        nextName,
        nextParentId,
        row.id,
        folderRepo,
      );

      row.name = nextName;
      row.parentId = nextParentId;
      row.updatedBy = actor.sub;
      const saved = await this.saveOrConflict(row, folderRepo);
      const counts = await this.mediaCounts([saved.id]);
      return this.toResponse(saved, counts.get(saved.id) ?? 0);
    });
  }

  async delete(id: string, actor: JwtUserPayload): Promise<{ success: true }> {
    this.assertSuperAdmin(actor);
    return this.dataSource.transaction(async (manager) => {
      const folderRepo = manager.getRepository(MediaFolder);
      const objectRepo = manager.getRepository(StorageObject);
      const row = await this.findPlatformFolderOrThrow(id, folderRepo);
      const childCount = await folderRepo.count({
        where: { parentId: row.id },
      });
      if (childCount > 0) {
        throw new ConflictException('Folder must be empty before deletion.');
      }
      const mediaCount = await objectRepo.count({
        where: { folderId: row.id, status: 'ACTIVE' },
      });
      if (mediaCount > 0) {
        throw new ConflictException('Folder must be empty before deletion.');
      }
      await folderRepo.remove(row);
      return { success: true as const };
    });
  }

  async moveMedia(
    mediaId: string,
    input: MoveMediaFolderDto,
    actor: JwtUserPayload,
  ): Promise<StorageObject> {
    this.assertSuperAdmin(actor);
    const folderId = input.folderId ?? null;
    return this.dataSource.transaction(async (manager) => {
      const objectRepo = manager.getRepository(StorageObject);
      const folderRepo = manager.getRepository(MediaFolder);
      const media = await objectRepo.findOne({
        where: { id: mediaId },
        relations: { provider: true, folder: true },
      });
      if (!media) throw new NotFoundException('Media object not found.');
      if (media.ownershipType !== 'PLATFORM' || media.tenantId !== null) {
        throw new ForbiddenException('Only platform media can be moved.');
      }
      if (media.status !== 'ACTIVE') {
        throw new BadRequestException(
          'Deleted media cannot be assigned to folders.',
        );
      }
      if (folderId) {
        await this.findPlatformFolderOrThrow(folderId, folderRepo);
      }
      await objectRepo.update(
        { id: media.id },
        {
          folderId,
          updatedBy: actor.sub,
        },
      );

      return objectRepo.findOneOrFail({
        where: { id: media.id },
        relations: { provider: true, folder: true },
      });
    });
  }

  private async mediaCounts(folderIds: string[]): Promise<Map<string, number>> {
    if (folderIds.length === 0) return new Map();
    const rows = await this.storageObjects
      .createQueryBuilder('media')
      .select('media.folderId', 'folderId')
      .addSelect('COUNT(*)', 'count')
      .where('media.folderId IN (:...folderIds)', { folderIds })
      .andWhere('media.status = :status', { status: 'ACTIVE' })
      .groupBy('media.folderId')
      .getRawMany<{ folderId: string; count: string }>();
    return new Map(rows.map((row) => [row.folderId, Number(row.count)]));
  }

  private async assertValidParentMove(
    folderId: string,
    parentId: string,
    repo: Repository<MediaFolder> = this.folders,
  ): Promise<void> {
    if (folderId === parentId) {
      throw new BadRequestException('Folder cannot be its own parent.');
    }
    let current = await this.findPlatformFolderOrThrow(parentId, repo);
    for (let depth = 0; depth < MAX_FOLDER_DEPTH; depth += 1) {
      if (current.id === folderId) {
        throw new BadRequestException(
          'Folder cannot be moved under its descendant.',
        );
      }
      if (!current.parentId) return;
      current = await this.findPlatformFolderOrThrow(current.parentId, repo);
    }
    throw new BadRequestException('Folder hierarchy is too deep.');
  }

  private async assertSiblingNameAvailable(
    name: string,
    parentId: string | null,
    excludeId?: string,
    repo: Repository<MediaFolder> = this.folders,
  ): Promise<void> {
    let qb = repo
      .createQueryBuilder('folder')
      .where('folder.ownershipType = :ownershipType', {
        ownershipType: 'PLATFORM',
      })
      .andWhere('folder.tenantId IS NULL')
      .andWhere('LOWER(folder.name) = LOWER(:name)', { name });
    qb = parentId
      ? qb.andWhere('folder.parentId = :parentId', { parentId })
      : qb.andWhere('folder.parentId IS NULL');
    if (excludeId) qb.andWhere('folder.id <> :excludeId', { excludeId });
    if (await qb.getExists()) {
      throw new ConflictException(
        'Folder name already exists in this location.',
      );
    }
  }

  private async findPlatformFolderOrThrow(
    id: string,
    repo: Repository<MediaFolder> = this.folders,
  ): Promise<MediaFolder> {
    if (!this.isUuid(id))
      throw new BadRequestException('Folder id is invalid.');
    const row = await repo.findOne({
      where: { id, ownershipType: 'PLATFORM', tenantId: IsNull() },
    });
    if (!row) throw new NotFoundException('Folder not found.');
    return row;
  }

  private normalizeName(input: string): string {
    const value = input.replace(/\s+/g, ' ').trim();
    if (!value) throw new BadRequestException('Folder name is required.');
    if (value.length > 120) {
      throw new BadRequestException('Folder name is too long.');
    }
    if (value === '.' || value === '..') {
      throw new BadRequestException('Folder name is invalid.');
    }
    if (/[\x00-\x1F\x7F/\\]/.test(value)) {
      throw new BadRequestException('Folder name contains invalid characters.');
    }
    return value;
  }

  private async saveOrConflict(
    row: MediaFolder,
    repo: Repository<MediaFolder>,
  ): Promise<MediaFolder> {
    try {
      return await repo.save(row);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'Folder name already exists in this location.',
        );
      }
      throw error;
    }
  }

  private toResponse(
    row: MediaFolder,
    mediaCount: number,
  ): MediaFolderResponseDto {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parentId ?? null,
      ownershipType: row.ownershipType,
      tenantId: row.tenantId ?? null,
      mediaCount,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : null,
    };
  }

  private assertSuperAdmin(actor: JwtUserPayload): void {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin access is required.');
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
