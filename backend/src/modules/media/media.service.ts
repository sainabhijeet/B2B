import { createHash, randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { MediaFolder } from '../../common/entities/media-folder.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { PlatformStorageRuntimeService } from '../storage-providers/platform-storage-runtime.service';
import { StorageObjectsService } from '../storage-providers/storage-objects.service';
import { normalizeStorageObjectKey } from '../storage-providers/storage-object-key.util';
import { UploadValidationService } from '../storage-providers/upload-validation.service';
import {
  ListMediaDto,
  MediaFileTypeFilter,
  MediaSortOption,
  MediaStatusFilter,
} from './dto/list-media.dto';
import { MediaQuarantineStorageService } from './media-quarantine-storage.service';
import { MediaScanQueueService } from './media-scan-queue.service';
import {
  MediaListResponseDto,
  MediaResponseDto,
} from './dto/media-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MEDIA_UPLOAD_CATEGORY = 'media_library';

const CATEGORY_MODULE_LABELS: Record<string, string> = {
  activation_smoke: 'Storage',
  ai_logo: 'Branding',
  build_artifact: 'Build artifacts',
  invoice: 'Invoices',
  invoice_document: 'Invoices',
  media_library: 'Media library',
  payment_proof: 'Payments',
  product_image: 'Products',
  tenant_media: 'Tenant media',
  theme_artifact: 'Themes',
  theme_preview: 'Themes',
  theme_upload: 'Themes',
};

const EXTENSIONS_BY_TYPE: Record<
  Exclude<MediaFileTypeFilter, MediaFileTypeFilter.OTHER>,
  string[]
> = {
  [MediaFileTypeFilter.IMAGE]: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'avif',
  ],
  [MediaFileTypeFilter.DOCUMENT]: [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'csv',
  ],
  [MediaFileTypeFilter.ARCHIVE]: ['zip', 'rar', '7z', 'tar', 'gz'],
  [MediaFileTypeFilter.VIDEO]: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
};

const SORT_OPTIONS: Record<
  MediaSortOption,
  { column: string; direction: 'ASC' | 'DESC' }
> = {
  [MediaSortOption.CREATED_AT_DESC]: {
    column: 'media.createdAt',
    direction: 'DESC',
  },
  [MediaSortOption.CREATED_AT_ASC]: {
    column: 'media.createdAt',
    direction: 'ASC',
  },
  [MediaSortOption.NAME_ASC]: {
    column: 'media.originalFilename',
    direction: 'ASC',
  },
  [MediaSortOption.NAME_DESC]: {
    column: 'media.originalFilename',
    direction: 'DESC',
  },
  [MediaSortOption.SIZE_ASC]: { column: 'media.sizeBytes', direction: 'ASC' },
  [MediaSortOption.SIZE_DESC]: {
    column: 'media.sizeBytes',
    direction: 'DESC',
  },
};

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly storageObjects: Repository<StorageObject>,
    @InjectRepository(MediaFolder)
    private readonly mediaFolders: Repository<MediaFolder>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly uploadValidation: UploadValidationService,
    private readonly storageRuntime: PlatformStorageRuntimeService,
    private readonly storageObjectRegistry: StorageObjectsService,
    private readonly quarantine: MediaQuarantineStorageService,
    private readonly scanQueue: MediaScanQueueService,
    private readonly config: ConfigService,
  ) {}

  async list(query: ListMediaDto): Promise<MediaListResponseDto> {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const qb = this.storageObjects
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.provider', 'provider')
      .leftJoinAndSelect('media.folder', 'folder')
      .where('media.status = :status', {
        status: query.status ?? MediaStatusFilter.ACTIVE,
      });

    if (query.folderId) {
      await this.assertPlatformFolder(query.folderId);
    }

    this.applyFilters(qb, query);
    this.applySort(qb, query.sort);

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: rows.map((row) => this.toResponse(row)),
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    };
  }

  async getById(id: string): Promise<MediaResponseDto> {
    const row = await this.storageObjects.findOne({
      where: { id },
      relations: { provider: true, folder: true },
    });

    if (!row) {
      throw new NotFoundException('Media object not found');
    }

    return this.toResponse(row);
  }

  async upload(
    file: Express.Multer.File | undefined,
    actor: JwtUserPayload,
  ): Promise<MediaResponseDto> {
    if (!file) throw new BadRequestException('file is required.');
    if (
      !this.config.get<boolean>('mediaMalware.enabled', true) ||
      !this.config.get<boolean>('mediaMalware.failClosed', true)
    ) {
      throw new ServiceUnavailableException(
        'Media security scanning is unavailable.',
      );
    }

    const firstPass = this.uploadValidation.validateFileOrThrow({
      category: MEDIA_UPLOAD_CATEGORY,
      file,
    });
    const objectId = randomUUID();
    const objectKey = this.generateMediaObjectKey(firstPass, objectId);
    const validatedUpload = this.uploadValidation.validateFileOrThrow({
      category: MEDIA_UPLOAD_CATEGORY,
      file,
      objectKey,
    });
    const resolution = await this.storageRuntime.resolveProvider();
    const checksumSha256 = this.checksumSha256(file.buffer);
    await this.quarantine.write(
      objectId,
      Readable.from(file.buffer),
      this.config.get<number>('mediaMalware.maxBytes', 25 * 1024 * 1024),
    );

    try {
      await this.storageObjectRegistry.registerQuarantinedPlatformObject(
        objectId,
        {
          providerId: resolution.metadata.providerId,
          objectKey,
          originalFilename: this.sanitizeOriginalFilename(
            validatedUpload.filename,
          ),
          mimeType: validatedUpload.detectedMimeType,
          sizeBytes: validatedUpload.sizeBytes,
          checksumSha256,
          objectCategory: MEDIA_UPLOAD_CATEGORY,
          metadata: {
            source: 'admin.media.upload',
            runtimeSource: resolution.metadata.source,
          },
        },
        actor,
      );
      await this.auditLogs.save({
        tenantId: null,
        actorUserId: actor.sub,
        action: 'MEDIA_UPLOAD_QUARANTINED',
        metadata: { objectId, sizeBytes: validatedUpload.sizeBytes },
      });
    } catch (error) {
      await this.quarantine.delete(objectId).catch(() => undefined);
      throw error;
    }

    try {
      await this.scanQueue.enqueue(objectId);
    } catch {
      await this.storageObjects.update(
        { id: objectId, status: 'QUARANTINED' },
        { scanStatus: 'SCAN_FAILED', scannerErrorCode: 'QUEUE_UNAVAILABLE' },
      );
      await this.auditLogs.save({
        tenantId: null,
        actorUserId: actor.sub,
        action: 'MEDIA_SCAN_QUEUE_FAILED',
        metadata: { objectId, errorCode: 'QUEUE_UNAVAILABLE' },
      });
    }
    return this.getById(objectId);
  }

  private applyFilters(
    qb: SelectQueryBuilder<StorageObject>,
    query: ListMediaDto,
  ): void {
    if (query.search) {
      const search = `%${this.escapeLike(query.search.toLowerCase())}%`;
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('LOWER(media.original_filename) LIKE :search', { search })
            .orWhere('LOWER(media.object_key) LIKE :search', { search })
            .orWhere('LOWER(media.object_category) LIKE :search', { search })
            .orWhere('LOWER(media.mime_type) LIKE :search', { search });
        }),
      );
    }

    if (query.category) {
      qb.andWhere('media.object_category = :category', {
        category: query.category,
      });
    }

    if (query.module) {
      this.applyModuleFilter(qb, query.module);
    }

    if (query.ownershipType) {
      qb.andWhere('media.ownership_type = :ownershipType', {
        ownershipType: query.ownershipType,
      });
    }

    if (query.providerId) {
      qb.andWhere('media.provider_id = :providerId', {
        providerId: query.providerId,
      });
    }

    if (query.tenantId) {
      qb.andWhere('media.tenant_id = :tenantId', { tenantId: query.tenantId });
    }

    if (query.mimeType) {
      qb.andWhere('media.mime_type = :mimeType', { mimeType: query.mimeType });
    }

    if (query.folderId) {
      qb.andWhere('media.folder_id = :folderId', { folderId: query.folderId });
    }

    if (query.unfiled) {
      qb.andWhere('media.folder_id IS NULL');
    }

    if (query.fileType) {
      this.applyFileTypeFilter(qb, query.fileType);
    }
  }

  private applyModuleFilter(
    qb: SelectQueryBuilder<StorageObject>,
    module: string,
  ): void {
    const normalized = module.trim().toLowerCase();
    const categories = Object.entries(CATEGORY_MODULE_LABELS)
      .filter(([, label]) => label.toLowerCase() === normalized)
      .map(([category]) => category);

    if (categories.length > 0) {
      qb.andWhere('media.object_category IN (:...moduleCategories)', {
        moduleCategories: categories,
      });
      return;
    }

    if (normalized === 'other') {
      qb.andWhere('media.object_category NOT IN (:...knownCategories)', {
        knownCategories: Object.keys(CATEGORY_MODULE_LABELS),
      });
      return;
    }

    qb.andWhere('1 = 0');
  }

  private applyFileTypeFilter(
    qb: SelectQueryBuilder<StorageObject>,
    fileType: MediaFileTypeFilter,
  ): void {
    if (fileType === MediaFileTypeFilter.OTHER) {
      qb.andWhere(
        new Brackets((nested) => {
          nested.where('media.mime_type IS NULL').orWhere(
            new Brackets((mime) => {
              mime
                .where('media.mime_type NOT LIKE :imageMime', {
                  imageMime: 'image/%',
                })
                .andWhere('media.mime_type NOT LIKE :videoMime', {
                  videoMime: 'video/%',
                })
                .andWhere('media.mime_type NOT IN (:...knownMimeTypes)', {
                  knownMimeTypes: [
                    'application/pdf',
                    'application/zip',
                    'application/x-zip-compressed',
                    'application/gzip',
                    'text/plain',
                    'text/csv',
                  ],
                });
            }),
          );
        }),
      );
      return;
    }

    const extensions = EXTENSIONS_BY_TYPE[fileType];
    const extensionPatterns = extensions.map((extension) => `%.${extension}`);

    if (
      fileType === MediaFileTypeFilter.IMAGE ||
      fileType === MediaFileTypeFilter.VIDEO
    ) {
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('media.mime_type LIKE :mimePrefix', {
              mimePrefix: `${fileType}/%`,
            })
            .orWhere('LOWER(media.object_key) LIKE ANY(:extensionPatterns)', {
              extensionPatterns,
            });
        }),
      );
      return;
    }

    const mimeTypes =
      fileType === MediaFileTypeFilter.DOCUMENT
        ? [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ]
        : [
            'application/zip',
            'application/x-zip-compressed',
            'application/gzip',
            'application/x-rar-compressed',
          ];

    qb.andWhere(
      new Brackets((nested) => {
        nested
          .where('media.mime_type IN (:...mimeTypes)', { mimeTypes })
          .orWhere('LOWER(media.object_key) LIKE ANY(:extensionPatterns)', {
            extensionPatterns,
          });
      }),
    );
  }

  private applySort(
    qb: SelectQueryBuilder<StorageObject>,
    sort?: MediaSortOption,
  ): void {
    const option =
      SORT_OPTIONS[sort ?? MediaSortOption.CREATED_AT_DESC] ??
      SORT_OPTIONS[MediaSortOption.CREATED_AT_DESC];
    qb.orderBy(option.column, option.direction, 'NULLS LAST');
  }

  private toResponse(row: StorageObject): MediaResponseDto {
    const provider = row.provider
      ? {
          id: row.provider.id,
          name: row.provider.name,
          type: row.provider.type,
        }
      : null;

    return {
      id: row.id,
      objectKey: row.objectKey,
      filename: this.filenameFromObjectKey(row.objectKey),
      originalName: row.originalFilename ?? null,
      mimeType: row.mimeType ?? null,
      sizeBytes: String(row.sizeBytes ?? '0'),
      fileType: this.detectFileType(row.mimeType, row.objectKey),
      category: row.objectCategory,
      module: CATEGORY_MODULE_LABELS[row.objectCategory] ?? 'Other',
      ownershipType: row.ownershipType,
      tenantId: row.tenantId ?? null,
      providerId: row.providerId ?? null,
      provider,
      folderId: row.folderId ?? null,
      folderName: row.folder?.name ?? null,
      status: row.status,
      scanRequired: row.scanRequired ?? false,
      scanStatus: row.scanStatus ?? 'NOT_REQUIRED',
      createdAt: this.toIso(row.createdAt),
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private async assertPlatformFolder(folderId: string): Promise<void> {
    const folder = await this.mediaFolders.findOne({
      where: { id: folderId, ownershipType: 'PLATFORM', tenantId: IsNull() },
      select: ['id'],
    });
    if (!folder) {
      throw new BadRequestException('Folder id is invalid.');
    }
  }
  private detectFileType(
    mimeType?: string | null,
    objectKey?: string,
  ): MediaFileTypeFilter {
    const mime = mimeType?.toLowerCase() ?? '';
    const extension = objectKey?.split('.').pop()?.toLowerCase();

    if (
      mime.startsWith('image/') ||
      this.hasExtension(extension, EXTENSIONS_BY_TYPE.image)
    ) {
      return MediaFileTypeFilter.IMAGE;
    }

    if (
      mime.startsWith('video/') ||
      this.hasExtension(extension, EXTENSIONS_BY_TYPE.video)
    ) {
      return MediaFileTypeFilter.VIDEO;
    }

    if (
      ['application/pdf', 'text/plain', 'text/csv'].includes(mime) ||
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      this.hasExtension(extension, EXTENSIONS_BY_TYPE.document)
    ) {
      return MediaFileTypeFilter.DOCUMENT;
    }

    if (
      mime.includes('zip') ||
      mime.includes('gzip') ||
      mime.includes('rar') ||
      this.hasExtension(extension, EXTENSIONS_BY_TYPE.archive)
    ) {
      return MediaFileTypeFilter.ARCHIVE;
    }

    return MediaFileTypeFilter.OTHER;
  }

  private hasExtension(
    extension: string | undefined,
    extensions: string[],
  ): boolean {
    return extension ? extensions.includes(extension) : false;
  }

  private filenameFromObjectKey(objectKey: string): string {
    const normalized = objectKey.replace(/\\/g, '/');
    return normalized.split('/').pop() || objectKey;
  }

  private normalizePage(page?: number): number {
    return Number.isInteger(page) && page && page > 0 ? page : DEFAULT_PAGE;
  }

  private normalizeLimit(limit?: number): number {
    if (!Number.isInteger(limit) || !limit || limit < 1) {
      return DEFAULT_LIMIT;
    }

    return Math.min(limit, MAX_LIMIT);
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (match) => `\\${match}`);
  }

  private toIso(value?: Date | null): string | null {
    return value instanceof Date ? value.toISOString() : null;
  }

  private generateMediaObjectKey(
    input: { filename: string; extension: string },
    objectId: string,
  ): string {
    const stem =
      this.safeFilenameStem(path.basename(input.filename, input.extension)) ||
      'media';
    return normalizeStorageObjectKey(
      path.posix.join(
        'media-library',
        new Date().toISOString().slice(0, 10),
        objectId,
        `${stem}${input.extension}`,
      ),
    );
  }

  private sanitizeOriginalFilename(filename: string): string {
    const basename = path.basename(filename.trim());
    const sanitized = basename
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
    return (sanitized || 'upload').slice(0, 255);
  }

  private safeFilenameStem(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .toLowerCase();
  }

  private checksumSha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
