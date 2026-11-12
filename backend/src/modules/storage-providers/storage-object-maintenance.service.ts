import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { opendir, realpath, unlink } from 'node:fs/promises';
import * as path from 'node:path';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { LocalStorageRuntimeAdapter } from './local-storage-runtime.adapter';
import { normalizeStorageObjectKey } from './storage-object-key.util';
import { StorageObjectsService } from './storage-objects.service';

export type StorageConsistencyIssueType =
  | 'REGISTRY_MISSING_PHYSICAL'
  | 'PHYSICAL_MISSING_REGISTRY'
  | 'INVALID_PROVIDER'
  | 'INACTIVE_PROVIDER'
  | 'OWNERSHIP_SCOPE_MISMATCH'
  | 'INVALID_OBJECT_KEY';

export type StorageConsistencyIssue = {
  type: StorageConsistencyIssueType;
  objectId?: string;
  objectKey: string;
  tenantId?: string | null;
  providerId?: string | null;
  ownershipType?: string;
  message: string;
};

export type StorageConsistencyReport = {
  dryRun: true;
  scanned: number;
  issues: StorageConsistencyIssue[];
  limit: number;
};

export type StorageCleanupReport = {
  dryRun: boolean;
  scanned: number;
  deleted: number;
  skipped: number;
  issues: StorageConsistencyIssue[];
  limit: number;
};

export type StorageSecureDeleteResult = {
  dryRun: boolean;
  objectId: string;
  deletedPhysical: boolean;
  registryStatus: 'ACTIVE' | 'DELETED';
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DEFAULT_CLEANUP_LIMIT = 50;
const MAX_SCAN_DEPTH = 4;

@Injectable()
export class StorageObjectMaintenanceService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly objectRepository: Repository<StorageObject>,
    @InjectRepository(PlatformStorageProvider)
    private readonly providerRepository: Repository<PlatformStorageProvider>,
    private readonly storageObjects: StorageObjectsService,
  ) {}

  async inspectRegistryConsistency(
    actor: JwtUserPayload,
    limit = DEFAULT_LIMIT,
  ): Promise<StorageConsistencyReport> {
    const boundedLimit = this.boundLimit(limit, DEFAULT_LIMIT);
    const where = this.registryScope(actor);
    const rows = await this.objectRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: boundedLimit,
    });
    const local = new LocalStorageRuntimeAdapter(getBackendStorageRoot(), null);
    const issues: StorageConsistencyIssue[] = [];

    for (const row of rows) {
      issues.push(...(await this.inspectRegistryRow(row, local)));
    }

    return { dryRun: true, scanned: rows.length, issues, limit: boundedLimit };
  }

  async inspectLocalOrphans(
    actor: JwtUserPayload,
    prefix: string,
    limit = DEFAULT_LIMIT,
  ): Promise<StorageConsistencyReport> {
    this.assertSuperAdmin(actor);
    const boundedLimit = this.boundLimit(limit, DEFAULT_LIMIT);
    const normalizedPrefix = normalizeStorageObjectKey(prefix);
    const files = await this.scanLocalFiles(normalizedPrefix, boundedLimit);
    const issues: StorageConsistencyIssue[] = [];

    for (const objectKey of files) {
      const exists = await this.objectRepository.count({
        where: { objectKey, status: 'ACTIVE' },
      });
      if (exists === 0) {
        issues.push({
          type: 'PHYSICAL_MISSING_REGISTRY',
          objectKey,
          message: 'Physical file exists without an active registry record.',
        });
      }
    }

    return { dryRun: true, scanned: files.length, issues, limit: boundedLimit };
  }

  async cleanupLocalOrphans(input: {
    actor: JwtUserPayload;
    prefix: string;
    dryRun?: boolean;
    limit?: number;
  }): Promise<StorageCleanupReport> {
    this.assertSuperAdmin(input.actor);
    const dryRun = input.dryRun !== false;
    const inspection = await this.inspectLocalOrphans(
      input.actor,
      input.prefix,
      Math.min(input.limit ?? DEFAULT_CLEANUP_LIMIT, DEFAULT_CLEANUP_LIMIT),
    );
    let deleted = 0;
    let skipped = 0;

    if (!dryRun) {
      for (const issue of inspection.issues) {
        if (issue.type !== 'PHYSICAL_MISSING_REGISTRY') {
          skipped += 1;
          continue;
        }
        await unlink(await this.safeLocalPath(issue.objectKey));
        deleted += 1;
      }
    } else {
      skipped = inspection.issues.length;
    }

    return {
      dryRun,
      scanned: inspection.scanned,
      deleted,
      skipped,
      issues: inspection.issues,
      limit: inspection.limit,
    };
  }

  async secureDelete(input: {
    objectId: string;
    actor: JwtUserPayload;
    dryRun?: boolean;
    deletePhysical?: boolean;
  }): Promise<StorageSecureDeleteResult> {
    const object = await this.findObjectOrThrow(input.objectId);
    await this.storageObjects.authorizeObjectAccess(
      object,
      input.actor,
      'delete',
    );
    if (object.status !== 'ACTIVE' || object.deletedAt) {
      throw new NotFoundException('Storage object is not available.');
    }
    const dryRun = input.dryRun !== false;
    const deletePhysical = input.deletePhysical === true;

    if (!dryRun && deletePhysical) {
      if (object.providerId) {
        const provider = await this.providerRepository.findOne({
          where: { id: object.providerId },
          select: ['id', 'type', 'status'],
        });
        if (!provider || provider.status !== 'active') {
          throw new BadRequestException(
            'Storage object provider is not currently available.',
          );
        }
        if (provider.type !== 'LOCAL') {
          throw new BadRequestException(
            'Provider-backed physical deletion requires an explicit migration plan.',
          );
        }
      }
      const local = new LocalStorageRuntimeAdapter(
        getBackendStorageRoot(),
        null,
      );
      const head = await local.head(object.objectKey);
      if (!head)
        throw new NotFoundException('Storage object content is unavailable.');
      await local.delete(object.objectKey);
    }

    if (!dryRun) {
      object.status = 'DELETED';
      object.deletedAt = new Date();
      object.updatedBy = input.actor.sub;
      await this.objectRepository.save(object);
    }

    return {
      dryRun,
      objectId: object.id,
      deletedPhysical: !dryRun && deletePhysical,
      registryStatus: dryRun ? object.status : 'DELETED',
    };
  }

  private async inspectRegistryRow(
    row: StorageObject,
    local: LocalStorageRuntimeAdapter,
  ): Promise<StorageConsistencyIssue[]> {
    const issues: StorageConsistencyIssue[] = [];
    try {
      normalizeStorageObjectKey(row.objectKey);
    } catch {
      issues.push(
        this.issue(row, 'INVALID_OBJECT_KEY', 'Object key is invalid.'),
      );
      return issues;
    }

    if (
      (row.ownershipType === 'PLATFORM' && row.tenantId !== null) ||
      (row.ownershipType === 'TENANT' && !row.tenantId) ||
      (row.ownershipType === 'PLATFORM' &&
        row.accessScope !== 'PLATFORM_PRIVATE') ||
      (row.ownershipType === 'TENANT' && row.accessScope === 'PLATFORM_PRIVATE')
    ) {
      issues.push(
        this.issue(
          row,
          'OWNERSHIP_SCOPE_MISMATCH',
          'Object ownership and access scope are inconsistent.',
        ),
      );
    }

    if (row.providerId) {
      const provider = await this.providerRepository.findOne({
        where: { id: row.providerId },
        select: ['id', 'status'],
      });
      if (!provider) {
        issues.push(
          this.issue(
            row,
            'INVALID_PROVIDER',
            'Object references a missing storage provider.',
          ),
        );
      } else if (provider.status !== 'active') {
        issues.push(
          this.issue(
            row,
            'INACTIVE_PROVIDER',
            'Object references an inactive storage provider.',
          ),
        );
      }
      return issues;
    }

    if (row.status === 'ACTIVE' && !(await local.exists(row.objectKey))) {
      issues.push(
        this.issue(
          row,
          'REGISTRY_MISSING_PHYSICAL',
          'Registry record points to missing local content.',
        ),
      );
    }
    return issues;
  }

  private async scanLocalFiles(
    prefix: string,
    limit: number,
  ): Promise<string[]> {
    const root = path.resolve(getBackendStorageRoot());
    const rootReal = await realpath(root).catch(() => root);
    const start = await this.safeLocalPath(prefix);
    const files: string[] = [];

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (files.length >= limit || depth > MAX_SCAN_DEPTH) return;
      const dirReal = await realpath(dir);
      this.assertInside(rootReal, dirReal, true);
      const handle = await opendir(dirReal);
      for await (const entry of handle) {
        if (files.length >= limit) break;
        const next = path.join(dirReal, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          await walk(next, depth + 1);
        } else if (entry.isFile()) {
          const fileReal = await realpath(next);
          this.assertInside(rootReal, fileReal);
          files.push(path.relative(rootReal, fileReal).replace(/\\/g, '/'));
        }
      }
    };

    await walk(start, 0).catch((error: unknown) => {
      if ((error as { code?: string }).code === 'ENOENT') return;
      throw error;
    });
    return files;
  }

  private async safeLocalPath(objectKey: string): Promise<string> {
    const normalized = normalizeStorageObjectKey(objectKey);
    const root = path.resolve(getBackendStorageRoot());
    const rootReal = await realpath(root).catch(() => root);
    const resolved = path.resolve(rootReal, normalized);
    this.assertInside(rootReal, resolved);
    const parentReal = await realpath(path.dirname(resolved)).catch(() =>
      path.dirname(resolved),
    );
    this.assertInside(rootReal, parentReal, true);
    return resolved;
  }

  private async findObjectOrThrow(id: string): Promise<StorageObject> {
    if (!this.isValidUuid(id))
      throw new BadRequestException('Storage object id is invalid.');
    const object = await this.objectRepository.findOne({ where: { id } });
    if (!object) throw new NotFoundException('Storage object not found.');
    return object;
  }

  private registryScope(
    actor: JwtUserPayload,
  ): FindOptionsWhere<StorageObject> | undefined {
    if (actor.role === UserRole.SUPER_ADMIN) return undefined;
    if (!actor.tenantId)
      throw new ForbiddenException('A tenant context is required.');
    return { tenantId: actor.tenantId };
  }

  private issue(
    row: StorageObject,
    type: StorageConsistencyIssueType,
    message: string,
  ): StorageConsistencyIssue {
    return {
      type,
      objectId: row.id,
      objectKey: row.objectKey,
      tenantId: row.tenantId,
      providerId: row.providerId,
      ownershipType: row.ownershipType,
      message,
    };
  }

  private boundLimit(value: number, fallback: number): number {
    if (!Number.isInteger(value) || value <= 0) return fallback;
    return Math.min(value, MAX_LIMIT);
  }

  private assertSuperAdmin(actor: JwtUserPayload): void {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Platform storage maintenance is not allowed.',
      );
    }
  }

  private assertInside(
    root: string,
    resolved: string,
    allowEqual = false,
  ): void {
    const relative = path.relative(root, resolved);
    if (
      (!allowEqual && relative === '') ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new BadRequestException(
        'Storage object key escapes the storage root.',
      );
    }
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
