import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { Repository } from 'typeorm';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { LocalStorageRuntimeAdapter } from './local-storage-runtime.adapter';
import { PlatformStorageRuntimeService } from './platform-storage-runtime.service';
import {
  SignedStorageObjectAccess,
  StorageObjectSignedAccessService,
} from './storage-object-signed-access.service';
import {
  StorageObjectMetadataResponse,
  StorageObjectsService,
} from './storage-objects.service';
import { PlatformStorageAdapter } from './storage-runtime.types';

export type StorageObjectDeliveryResult = {
  object: StorageObjectMetadataResponse;
  stream: Readable;
  contentLength: number | null;
  contentType: string;
  contentDisposition: string;
  signed: boolean;
};

@Injectable()
export class StorageObjectDeliveryService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly objectRepository: Repository<StorageObject>,
    private readonly storageObjects: StorageObjectsService,
    private readonly signedAccess: StorageObjectSignedAccessService,
    private readonly runtime: PlatformStorageRuntimeService,
    private readonly configService: ConfigService,
  ) {}

  async createSignedReadAccess(
    objectId: string,
    actor: JwtUserPayload,
  ): Promise<SignedStorageObjectAccess & { objectId: string; url: string }> {
    const object = await this.lookupForActor(objectId, actor);
    const token = this.signedAccess.createReadAccess(object);
    return {
      ...token,
      objectId: object.id,
      url: `${this.apiBasePath()}/storage-objects/${object.id}/content?token=${encodeURIComponent(token.token)}`,
    };
  }

  async openReadStream(input: {
    objectId: string;
    actor?: JwtUserPayload;
    token?: string;
  }): Promise<StorageObjectDeliveryResult> {
    const object = await this.findObjectOrThrow(input.objectId);
    const safeObject = this.storageObjects.toSafeMetadata(object);
    let signed = false;

    if (input.token?.trim()) {
      this.assertDeliverable(safeObject);
      this.signedAccess.validateReadAccess(input.token, safeObject);
      signed = true;
    } else if (input.actor) {
      this.storageObjects.authorizeObjectAccess(object, input.actor, 'read');
      this.assertDeliverable(safeObject);
    } else {
      throw new UnauthorizedException(
        'Valid storage object access is required.',
      );
    }

    const adapter = await this.adapterForObject(safeObject);
    let head;
    try {
      head = await adapter.head(safeObject.objectKey);
    } catch {
      throw new NotFoundException('Storage object content is unavailable.');
    }
    if (!head) {
      throw new NotFoundException('Storage object content is unavailable.');
    }

    let stream: Readable;
    try {
      stream = await adapter.getStream(safeObject.objectKey);
    } catch {
      throw new NotFoundException('Storage object content is unavailable.');
    }

    return {
      object: safeObject,
      stream,
      contentLength: head.contentLength,
      contentType: this.safeContentType(safeObject.mimeType),
      contentDisposition: this.safeContentDisposition(
        safeObject.originalFilename,
      ),
      signed,
    };
  }

  private async lookupForActor(
    objectId: string,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    const object = await this.findObjectOrThrow(objectId);
    this.storageObjects.authorizeObjectAccess(object, actor, 'read');
    const safeObject = this.storageObjects.toSafeMetadata(object);
    this.assertDeliverable(safeObject);
    return safeObject;
  }

  private async findObjectOrThrow(id: string): Promise<StorageObject> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Storage object id is invalid.');
    }
    const object = await this.objectRepository.findOne({ where: { id } });
    if (!object) throw new NotFoundException('Storage object not found.');
    return object;
  }

  private assertDeliverable(object: StorageObjectMetadataResponse): void {
    if (object.status !== 'ACTIVE' || object.deletedAt) {
      throw new NotFoundException('Storage object is not available.');
    }
    if (object.scanRequired && object.scanStatus !== 'CLEAN') {
      throw new NotFoundException('Storage object is not available.');
    }
  }

  private async adapterForObject(
    object: StorageObjectMetadataResponse,
  ): Promise<PlatformStorageAdapter> {
    if (!object.providerId) {
      return new LocalStorageRuntimeAdapter(getBackendStorageRoot(), null);
    }
    const resolution = await this.runtime.resolveProvider();
    if (resolution.metadata.providerId !== object.providerId) {
      throw new ServiceUnavailableException(
        'Storage object provider is not currently available.',
      );
    }
    return resolution.adapter;
  }

  private safeContentType(value: string | null): string {
    const normalized = value?.trim().toLowerCase() ?? '';
    if (
      /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(
        normalized,
      )
    ) {
      return normalized;
    }
    return 'application/octet-stream';
  }

  private safeContentDisposition(filename: string | null): string {
    const raw = filename?.trim() || 'download';
    const base = path
      .basename(raw)
      .replace(/[\r\n"\\]/g, '_')
      .slice(0, 120);
    return `inline; filename="${base || 'download'}"`;
  }

  private apiBasePath(): string {
    const prefix =
      this.configService.get<string>('apiPrefix', 'api/v1') ?? 'api/v1';
    return `/${prefix.replace(/^\/+|\/+$/g, '')}`;
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
