import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlatformStorageProvider,
  PlatformStorageProviderStatus,
} from '../../common/entities/platform-storage-provider.entity';
import {
  StorageObject,
  StorageObjectAccessScope,
  StorageObjectOwnershipType,
} from '../../common/entities/storage-object.entity';
import {
  PLATFORM_ROLES,
  TENANT_STAFF_ROLES,
  UserRole,
} from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { normalizeStorageObjectKey } from './storage-object-key.util';

export type StorageObjectAccessAction = 'read' | 'update' | 'delete';

export type RegisterStorageObjectInput = {
  providerId?: string | null;
  objectKey: string;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | string | null;
  checksumSha256?: string | null;
  objectCategory: string;
  accessScope?: StorageObjectAccessScope;
  metadata?: Record<string, unknown>;
};

export type StorageObjectMetadataResponse = {
  id: string;
  tenantId: string | null;
  providerId: string | null;
  objectKey: string;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  checksumSha256: string | null;
  ownershipType: StorageObjectOwnershipType;
  objectCategory: string;
  accessScope: StorageObjectAccessScope;
  status: string;
  deletedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  scanRequired: boolean;
  scanStatus: string;
  scannerProvider: string | null;
  scannerVerdict: string | null;
  scanStartedAt: Date | null;
  scannedAt: Date | null;
  scannerErrorCode: string | null;
  scanAttempts: number;
};

@Injectable()
export class StorageObjectsService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly objectRepository: Repository<StorageObject>,
    @InjectRepository(PlatformStorageProvider)
    private readonly providerRepository: Repository<PlatformStorageProvider>,
  ) {}

  async registerPlatformObject(
    input: RegisterStorageObjectInput,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    this.assertSuperAdmin(actor);
    await this.assertProviderUsable(input.providerId ?? null);
    const row = this.objectRepository.create({
      tenantId: null,
      providerId: input.providerId ?? null,
      objectKey: normalizeStorageObjectKey(input.objectKey),
      originalFilename: this.normalizeNullableText(input.originalFilename, 255),
      mimeType: this.normalizeNullableText(input.mimeType, 255),
      sizeBytes: this.normalizeSize(input.sizeBytes),
      checksumSha256: this.normalizeChecksum(input.checksumSha256),
      ownershipType: 'PLATFORM',
      objectCategory: this.normalizeCategory(input.objectCategory),
      accessScope: 'PLATFORM_PRIVATE',
      status: 'ACTIVE',
      deletedAt: null,
      metadata: this.safeMetadata(input.metadata),
      createdBy: actor.sub,
      updatedBy: actor.sub,
    });
    return this.toSafeMetadata(await this.saveOrConflict(row));
  }

  async registerQuarantinedPlatformObject(
    id: string,
    input: RegisterStorageObjectInput,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    this.assertSuperAdmin(actor);
    if (!this.isValidUuid(id))
      throw new BadRequestException('Storage object id is invalid.');
    await this.assertProviderUsable(input.providerId ?? null);
    const row = this.objectRepository.create({
      id,
      tenantId: null,
      providerId: input.providerId ?? null,
      objectKey: normalizeStorageObjectKey(input.objectKey),
      originalFilename: this.normalizeNullableText(input.originalFilename, 255),
      mimeType: this.normalizeNullableText(input.mimeType, 255),
      sizeBytes: this.normalizeSize(input.sizeBytes),
      checksumSha256: this.normalizeChecksum(input.checksumSha256),
      ownershipType: 'PLATFORM',
      objectCategory: this.normalizeCategory(input.objectCategory),
      accessScope: 'PLATFORM_PRIVATE',
      status: 'QUARANTINED',
      scanRequired: true,
      scanStatus: 'QUARANTINED',
      scanAttempts: 0,
      deletedAt: null,
      metadata: this.safeMetadata(input.metadata),
      createdBy: actor.sub,
      updatedBy: actor.sub,
    });
    return this.toSafeMetadata(await this.saveOrConflict(row));
  }

  async registerTenantObject(
    input: RegisterStorageObjectInput,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    if (!actor.tenantId) {
      throw new ForbiddenException('A tenant context is required.');
    }
    if (!this.canMutateTenantObjects(actor)) {
      throw new ForbiddenException(
        'Tenant object registration is not allowed.',
      );
    }
    return this.registerTenantObjectForTenant(actor.tenantId, input, actor);
  }

  async registerTenantObjectForTenant(
    tenantId: string,
    input: RegisterStorageObjectInput,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    if (!this.isSuperAdmin(actor) && actor.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant object access is not allowed.');
    }
    if (!this.isValidUuid(tenantId)) {
      throw new BadRequestException('Tenant context is invalid.');
    }
    await this.assertProviderUsable(input.providerId ?? null);
    const accessScope = input.accessScope ?? 'TENANT_PRIVATE';
    if (!['TENANT_PRIVATE', 'PUBLIC_METADATA'].includes(accessScope)) {
      throw new BadRequestException(
        'Tenant storage object access scope is invalid.',
      );
    }
    const row = this.objectRepository.create({
      tenantId,
      providerId: input.providerId ?? null,
      objectKey: normalizeStorageObjectKey(input.objectKey),
      originalFilename: this.normalizeNullableText(input.originalFilename, 255),
      mimeType: this.normalizeNullableText(input.mimeType, 255),
      sizeBytes: this.normalizeSize(input.sizeBytes),
      checksumSha256: this.normalizeChecksum(input.checksumSha256),
      ownershipType: 'TENANT',
      objectCategory: this.normalizeCategory(input.objectCategory),
      accessScope,
      status: 'ACTIVE',
      deletedAt: null,
      metadata: this.safeMetadata(input.metadata),
      createdBy: actor.sub,
      updatedBy: actor.sub,
    });
    return this.toSafeMetadata(await this.saveOrConflict(row));
  }

  async registerQuarantinedTenantObjectForTenant(
    tenantId: string,
    id: string,
    input: RegisterStorageObjectInput,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    if (!actor.tenantId || actor.tenantId !== tenantId) {
      if (!this.isSuperAdmin(actor)) {
        throw new ForbiddenException('Tenant object access is not allowed.');
      }
    }
    if (!this.isValidUuid(tenantId)) {
      throw new BadRequestException('Tenant context is invalid.');
    }
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Storage object id is invalid.');
    }
    await this.assertProviderUsable(input.providerId ?? null);
    const accessScope = input.accessScope ?? 'TENANT_PRIVATE';
    if (accessScope !== 'TENANT_PRIVATE') {
      throw new BadRequestException(
        'Tenant quarantined storage object access scope is invalid.',
      );
    }
    const row = this.objectRepository.create({
      id,
      tenantId,
      providerId: input.providerId ?? null,
      objectKey: normalizeStorageObjectKey(input.objectKey),
      originalFilename: this.normalizeNullableText(input.originalFilename, 255),
      mimeType: this.normalizeNullableText(input.mimeType, 255),
      sizeBytes: this.normalizeSize(input.sizeBytes),
      checksumSha256: this.normalizeChecksum(input.checksumSha256),
      ownershipType: 'TENANT',
      objectCategory: this.normalizeCategory(input.objectCategory),
      accessScope,
      status: 'QUARANTINED',
      scanRequired: true,
      scanStatus: 'QUARANTINED',
      scanAttempts: 0,
      deletedAt: null,
      metadata: this.safeMetadata(input.metadata),
      createdBy: actor.sub,
      updatedBy: actor.sub,
    });
    return this.toSafeMetadata(await this.saveOrConflict(row));
  }
  async lookupObject(
    id: string,
    actor: JwtUserPayload,
    action: StorageObjectAccessAction = 'read',
  ): Promise<StorageObjectMetadataResponse> {
    const row = await this.findObjectOrThrow(id);
    this.authorizeObjectAccess(row, actor, action);
    return this.toSafeMetadata(row);
  }

  async markDeleted(
    id: string,
    actor: JwtUserPayload,
  ): Promise<StorageObjectMetadataResponse> {
    const row = await this.findObjectOrThrow(id);
    this.authorizeObjectAccess(row, actor, 'delete');
    row.status = 'DELETED';
    row.deletedAt = new Date();
    row.updatedBy = actor.sub;
    return this.toSafeMetadata(await this.objectRepository.save(row));
  }

  authorizeObjectAccess(
    object: StorageObject,
    actor: JwtUserPayload,
    action: StorageObjectAccessAction = 'read',
  ): void {
    if (object.ownershipType === 'PLATFORM') {
      if (this.isSuperAdmin(actor)) return;
      if (action === 'read' && PLATFORM_ROLES.includes(actor.role)) return;
      throw new ForbiddenException(
        'Platform storage object access is not allowed.',
      );
    }

    if (
      !object.tenantId ||
      !actor.tenantId ||
      object.tenantId !== actor.tenantId
    ) {
      if (this.isSuperAdmin(actor)) return;
      throw new ForbiddenException(
        'Tenant storage object access is not allowed.',
      );
    }

    if (
      (object.objectCategory === 'customer_avatar' ||
        object.objectCategory === 'customer_gst_certificate' ||
        object.objectCategory === 'payment_proof') &&
      actor.role === UserRole.CUSTOMER
    ) {
      if (object.metadata?.customerId !== actor.customerId) {
        throw new ForbiddenException('Customer object access is not allowed.');
      }
      if (action === 'read') return;
      throw new ForbiddenException('Customer object mutation is not allowed.');
    }

    if (action === 'read') return;
    if (this.canMutateTenantObjects(actor)) return;
    throw new ForbiddenException(
      'Tenant storage object mutation is not allowed.',
    );
  }

  toSafeMetadata(row: StorageObject): StorageObjectMetadataResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      providerId: row.providerId,
      objectKey: row.objectKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      ownershipType: row.ownershipType,
      objectCategory: row.objectCategory,
      accessScope: row.accessScope,
      status: row.status,
      deletedAt: row.deletedAt,
      metadata: row.metadata ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      scanRequired: row.scanRequired ?? false,
      scanStatus: row.scanStatus ?? 'NOT_REQUIRED',
      scannerProvider: row.scannerProvider ?? null,
      scannerVerdict: row.scannerVerdict ?? null,
      scanStartedAt: row.scanStartedAt ?? null,
      scannedAt: row.scannedAt ?? null,
      scannerErrorCode: row.scannerErrorCode ?? null,
      scanAttempts: row.scanAttempts ?? 0,
    };
  }

  private async findObjectOrThrow(id: string): Promise<StorageObject> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Storage object id is invalid.');
    }
    const row = await this.objectRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Storage object not found.');
    return row;
  }

  private async assertProviderUsable(providerId: string | null): Promise<void> {
    if (!providerId) return;
    if (!this.isValidUuid(providerId)) {
      throw new BadRequestException('Storage provider id is invalid.');
    }
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
      select: ['id', 'status'],
    });
    if (
      !provider ||
      provider.status !== ('active' satisfies PlatformStorageProviderStatus)
    ) {
      throw new BadRequestException('Storage provider is not active.');
    }
  }

  private normalizeCategory(category: string): string {
    const value = category.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(value)) {
      throw new BadRequestException('Storage object category is invalid.');
    }
    return value;
  }

  private normalizeNullableText(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLength) {
      throw new BadRequestException(
        'Storage object metadata value is too long.',
      );
    }
    return trimmed;
  }

  private normalizeSize(
    value: number | string | null | undefined,
  ): string | null {
    if (value === undefined || value === null || value === '') return null;
    const asString = String(value);
    if (!/^\d+$/.test(asString)) {
      throw new BadRequestException('Storage object size is invalid.');
    }
    return asString;
  }

  private normalizeChecksum(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value === '') return null;
    const normalized = value.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) {
      throw new BadRequestException('Storage object checksum is invalid.');
    }
    return normalized;
  }

  private safeMetadata(
    value: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!value) return {};
    this.assertNoSecretMetadataKeys(value);
    const serialized = JSON.stringify(value);
    if (serialized.length > 8192) {
      throw new BadRequestException('Storage object metadata is too large.');
    }
    return JSON.parse(serialized) as Record<string, unknown>;
  }

  private assertNoSecretMetadataKeys(
    value: unknown,
    path: string[] = [],
  ): void {
    if (!value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[-_\s]/g, '');
      if (
        [
          'authorization',
          'accesstoken',
          'bearertoken',
          'credential',
          'credentials',
          'password',
          'secret',
          'signedurl',
          'token',
        ].some((blocked) => normalized.includes(blocked))
      ) {
        throw new BadRequestException(
          `Storage object metadata contains a protected field: ${[...path, key].join('.')}.`,
        );
      }
      this.assertNoSecretMetadataKeys(nested, [...path, key]);
    }
  }

  private async saveOrConflict(row: StorageObject): Promise<StorageObject> {
    try {
      return await this.objectRepository.save(row);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'Storage object key already exists for this owner/provider scope.',
        );
      }
      throw error;
    }
  }

  private assertSuperAdmin(actor: JwtUserPayload): void {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException(
        'Platform storage object access is not allowed.',
      );
    }
  }

  private canMutateTenantObjects(actor: JwtUserPayload): boolean {
    return TENANT_STAFF_ROLES.includes(actor.role);
  }

  private isSuperAdmin(actor: JwtUserPayload): boolean {
    return actor.role === UserRole.SUPER_ADMIN;
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
