import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { LocalStorageRuntimeAdapter } from '../storage-providers/local-storage-runtime.adapter';
import { PlatformStorageRuntimeService } from '../storage-providers/platform-storage-runtime.service';
import { MediaQuarantineStorageService } from './media-quarantine-storage.service';

export type MediaLifecycleResult = {
  id: string;
  status: 'ACTIVE' | 'DELETED';
};

export type BulkMediaLifecycleResult = {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    status?: 'ACTIVE' | 'DELETED';
    error?: string;
  }>;
};

type LifecycleOperation = 'delete' | 'restore';

@Injectable()
export class MediaLifecycleService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly objects: Repository<StorageObject>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly runtime: PlatformStorageRuntimeService,
    private readonly quarantine: MediaQuarantineStorageService,
  ) {}

  delete(id: string, actor: JwtUserPayload): Promise<MediaLifecycleResult> {
    return this.transition(id, actor, 'delete', true);
  }

  restore(id: string, actor: JwtUserPayload): Promise<MediaLifecycleResult> {
    return this.transition(id, actor, 'restore', true);
  }

  async bulkDelete(
    ids: string[],
    actor: JwtUserPayload,
  ): Promise<BulkMediaLifecycleResult> {
    return this.bulk(ids, actor, 'delete');
  }

  async bulkRestore(
    ids: string[],
    actor: JwtUserPayload,
  ): Promise<BulkMediaLifecycleResult> {
    return this.bulk(ids, actor, 'restore');
  }

  private async bulk(
    inputIds: string[],
    actor: JwtUserPayload,
    operation: LifecycleOperation,
  ): Promise<BulkMediaLifecycleResult> {
    this.assertSuperAdmin(actor);
    const ids = [...new Set(inputIds)].slice(0, 50);
    const known = await this.objects.find({
      where: { id: In(ids), ownershipType: 'PLATFORM' },
      select: ['id'],
    });
    const knownIds = new Set(known.map((row) => row.id));
    const results: BulkMediaLifecycleResult['results'] = [];

    for (const id of ids) {
      if (!knownIds.has(id)) {
        results.push({
          id,
          success: false,
          error: 'Platform media object was not found.',
        });
        continue;
      }
      try {
        const result = await this.transition(id, actor, operation, false);
        results.push({ id, success: true, status: result.status });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: this.safeError(error, operation),
        });
      }
    }

    const succeeded = results.filter((result) => result.success).length;
    await this.auditLogs.save({
      tenantId: null,
      actorUserId: actor.sub,
      action:
        operation === 'delete' ? 'MEDIA_BULK_DELETED' : 'MEDIA_BULK_RESTORED',
      metadata: {
        operation,
        requested: inputIds.length,
        processed: ids.length,
        succeeded,
        failed: results.length - succeeded,
      },
    });

    return {
      requested: inputIds.length,
      processed: ids.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  private async transition(
    id: string,
    actor: JwtUserPayload,
    operation: LifecycleOperation,
    auditSingle: boolean,
  ): Promise<MediaLifecycleResult> {
    this.assertSuperAdmin(actor);
    const object = await this.objects.findOne({ where: { id } });
    if (!object || object.ownershipType !== 'PLATFORM') {
      throw new NotFoundException('Platform media object was not found.');
    }

    if (
      operation === 'delete' &&
      object.scanRequired &&
      object.scanStatus !== 'CLEAN' &&
      (object.status === 'QUARANTINED' || object.status === 'DELETED')
    ) {
      return this.deleteQuarantined(object, actor, auditSingle);
    }

    const expected = operation === 'delete' ? 'ACTIVE' : 'DELETED';
    const next = operation === 'delete' ? 'DELETED' : 'ACTIVE';
    if (object.status !== expected) {
      throw new ConflictException(
        operation === 'delete'
          ? 'Media object is already deleted.'
          : 'Media object is not deleted.',
      );
    }

    if (operation === 'restore') {
      if (object.scanRequired && object.scanStatus !== 'CLEAN') {
        throw new ConflictException(
          'Media object has not passed security scanning.',
        );
      }
      await this.assertPhysicalContent(object);
    }

    return this.objects.manager.transaction(async (manager) => {
      const repository = manager.getRepository(StorageObject);
      const update = await repository.update(
        {
          id,
          ownershipType: 'PLATFORM',
          status: expected,
        },
        {
          status: next,
          deletedAt: operation === 'delete' ? new Date() : null,
          updatedBy: actor.sub,
        },
      );
      if (update.affected !== 1) {
        throw new ConflictException('Media lifecycle state changed.');
      }

      if (auditSingle) {
        await manager.getRepository(AuditLog).save({
          tenantId: null,
          actorUserId: actor.sub,
          action: operation === 'delete' ? 'MEDIA_DELETED' : 'MEDIA_RESTORED',
          metadata: {
            objectId: id,
            operation,
            resultStatus: next,
          },
        });
      }
      return { id, status: next };
    });
  }

  private async deleteQuarantined(
    object: StorageObject,
    actor: JwtUserPayload,
    auditSingle: boolean,
  ): Promise<MediaLifecycleResult> {
    if (object.status === 'QUARANTINED') {
      await this.objects.manager.transaction(async (manager) => {
        const update = await manager
          .getRepository(StorageObject)
          .update(
            { id: object.id, ownershipType: 'PLATFORM', status: 'QUARANTINED' },
            { status: 'DELETED', deletedAt: new Date(), updatedBy: actor.sub },
          );
        if (update.affected !== 1)
          throw new ConflictException('Media lifecycle state changed.');
        if (auditSingle) {
          await manager.getRepository(AuditLog).save({
            tenantId: null,
            actorUserId: actor.sub,
            action: 'MEDIA_QUARANTINE_DELETED',
            metadata: {
              objectId: object.id,
              priorScanStatus: object.scanStatus,
              resultingState: 'DELETED',
            },
          });
        }
      });
    }

    try {
      await this.quarantine.delete(object.id);
    } catch {
      await this.auditLogs.save({
        tenantId: null,
        actorUserId: actor.sub,
        action: 'MEDIA_QUARANTINE_CLEANUP_FAILED',
        metadata: {
          objectId: object.id,
          errorCode: 'QUARANTINE_CLEANUP_FAILED',
        },
      });
      throw new InternalServerErrorException(
        'Media quarantine cleanup failed.',
      );
    }
    return { id: object.id, status: 'DELETED' };
  }

  private async assertPhysicalContent(object: StorageObject): Promise<void> {
    try {
      if (!object.providerId) {
        const local = new LocalStorageRuntimeAdapter(
          getBackendStorageRoot(),
          null,
        );
        if (!(await local.head(object.objectKey))) {
          throw new Error('missing');
        }
        return;
      }

      const resolution = await this.runtime.resolveProvider();
      if (resolution.metadata.providerId !== object.providerId) {
        throw new Error('provider unavailable');
      }
      if (!(await resolution.adapter.head(object.objectKey))) {
        throw new Error('missing');
      }
    } catch {
      throw new ConflictException('Media content is not available to restore.');
    }
  }

  private assertSuperAdmin(actor: JwtUserPayload): void {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Platform media lifecycle access is not allowed.',
      );
    }
  }

  private safeError(error: unknown, operation: LifecycleOperation): string {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      return error.message;
    }
    return operation === 'delete'
      ? 'Media could not be deleted.'
      : 'Media could not be restored.';
  }
}
