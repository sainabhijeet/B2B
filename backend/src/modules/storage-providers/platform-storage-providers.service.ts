import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import {
  LocalStorageProviderConfig,
  PlatformStorageProvider,
  PlatformStorageProviderConfig,
  PlatformStorageProviderHealthStatus,
  PlatformStorageProviderMode,
  PlatformStorageProviderStatus,
  PlatformStorageProviderType,
  S3CompatibleStorageProviderConfig,
  S3CompatibleStorageProviderCredentials,
} from '../../common/entities/platform-storage-provider.entity';
import { CredentialEncryptionService } from '../../common/security/credential-encryption.service';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import { CreatePlatformStorageProviderDto } from './dto/create-platform-storage-provider.dto';
import { UpdatePlatformStorageProviderDto } from './dto/update-platform-storage-provider.dto';
import {
  RuntimeStorageProviderConfig,
  StorageProviderAdapter,
} from './storage-provider.adapter';
import { DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES } from './local-storage-runtime.adapter';
import { StorageEndpointSecurityService } from './storage-endpoint-security.service';

type StorageProviderAction =
  | 'INTEGRATION_STORAGE_PROVIDER_CREATED'
  | 'INTEGRATION_STORAGE_PROVIDER_UPDATED'
  | 'INTEGRATION_STORAGE_PROVIDER_ENABLED'
  | 'INTEGRATION_STORAGE_PROVIDER_DISABLED'
  | 'INTEGRATION_STORAGE_PROVIDER_DEFAULT_CHANGED'
  | 'INTEGRATION_STORAGE_PROVIDER_CONNECTION_TESTED'
  | 'INTEGRATION_STORAGE_PROVIDER_DELETED';

export type PlatformStorageProviderResponse = {
  id: string;
  name: string;
  type: PlatformStorageProviderType;
  status: PlatformStorageProviderStatus;
  isDefault: boolean;
  mode: PlatformStorageProviderMode;
  endpoint: string | null;
  region: string | null;
  bucketName: string | null;
  publicBaseUrl: string | null;
  accessKeyIdConfigured: boolean;
  secretAccessKeyConfigured: boolean;
  healthStatus: PlatformStorageProviderHealthStatus;
  lastCheckedAt: string | null;
  lastSuccessfulCheckAt: string | null;
  lastFailedCheckAt: string | null;
  lastLatencyMs: number | null;
  healthMessage: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StorageProviderConnectionTestResponse = {
  success: boolean;
  ok: boolean;
  provider: PlatformStorageProviderResponse;
  latencyMs: number;
  message: string;
};

type NormalizedStorageProvider = {
  name: string;
  type: PlatformStorageProviderType;
  status: PlatformStorageProviderStatus;
  isDefault: boolean;
  mode: PlatformStorageProviderMode;
  configuration: PlatformStorageProviderConfig;
  credentials: S3CompatibleStorageProviderCredentials;
};

const STORAGE_PROVIDER_TIMEOUT_MS = 5_000;

@Injectable()
export class PlatformStorageProvidersService {
  private readonly logger = new Logger(PlatformStorageProvidersService.name);

  constructor(
    @InjectRepository(PlatformStorageProvider)
    private readonly providerRepository: Repository<PlatformStorageProvider>,
    private readonly credentials: CredentialEncryptionService,
    private readonly adapter: StorageProviderAdapter,
    private readonly endpointSecurity: StorageEndpointSecurityService,
  ) {}

  async list(): Promise<PlatformStorageProviderResponse[]> {
    try {
      const rows = await this.providerRepository.find({
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
      return rows.map((row) => this.toResponse(row));
    } catch (error) {
      if (this.isMissingProviderTable(error)) return [];
      throw error;
    }
  }

  async get(id: string): Promise<PlatformStorageProviderResponse> {
    const row = await this.findByIdOrThrow(id);
    return this.toResponse(row);
  }

  async create(
    dto: CreatePlatformStorageProviderDto,
    actor: JwtUserPayload,
  ): Promise<PlatformStorageProviderResponse> {
    const normalized = this.normalizeCreate(dto);
    await this.assertResolvedEndpointSafe(normalized);
    return this.providerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PlatformStorageProvider);
      const existing = await repo.findOne({ where: { name: normalized.name } });
      if (existing) {
        throw new ConflictException(
          'A storage provider with this name exists.',
        );
      }
      if (normalized.isDefault) await this.clearDefault(manager);

      const row = repo.create({
        ...normalized,
        healthStatus: 'UNKNOWN',
        lastCheckedAt: null,
        lastSuccessfulCheckAt: null,
        lastFailedCheckAt: null,
        lastLatencyMs: null,
        healthMessage: null,
        createdBy: actor.sub,
        updatedBy: actor.sub,
      });
      const saved = await this.saveOrConflict(repo, row);
      await this.audit(
        manager,
        'INTEGRATION_STORAGE_PROVIDER_CREATED',
        actor,
        saved,
      );
      if (saved.isDefault) {
        await this.audit(
          manager,
          'INTEGRATION_STORAGE_PROVIDER_DEFAULT_CHANGED',
          actor,
          saved,
        );
      }
      return this.toResponse(saved);
    });
  }

  async update(
    id: string,
    dto: UpdatePlatformStorageProviderDto,
    actor: JwtUserPayload,
  ): Promise<PlatformStorageProviderResponse> {
    return this.providerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PlatformStorageProvider);
      const row = await this.findByIdOrThrow(id, repo);
      const previousStatus = row.status;
      const normalized = this.normalizeUpdate(row, dto);
      await this.assertResolvedEndpointSafe(normalized);

      if (row.isDefault && normalized.status === 'inactive') {
        throw new BadRequestException(
          'The default storage provider must stay active.',
        );
      }

      const nameConflict = await repo.findOne({
        where: { name: normalized.name },
      });
      if (nameConflict && nameConflict.id !== row.id) {
        throw new ConflictException(
          'A storage provider with this name exists.',
        );
      }

      row.name = normalized.name;
      row.status = normalized.status;
      row.mode = normalized.mode;
      row.configuration = normalized.configuration;
      row.credentials = normalized.credentials;
      row.updatedBy = actor.sub;

      const saved = await this.saveOrConflict(repo, row);
      await this.audit(
        manager,
        'INTEGRATION_STORAGE_PROVIDER_UPDATED',
        actor,
        saved,
        { changedFields: this.changedFields(dto) },
      );
      if (previousStatus !== saved.status) {
        await this.audit(
          manager,
          saved.status === 'active'
            ? 'INTEGRATION_STORAGE_PROVIDER_ENABLED'
            : 'INTEGRATION_STORAGE_PROVIDER_DISABLED',
          actor,
          saved,
        );
      }
      return this.toResponse(saved);
    });
  }

  async remove(id: string, actor: JwtUserPayload): Promise<{ deleted: true }> {
    return this.providerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PlatformStorageProvider);
      const row = await this.findByIdOrThrow(id, repo);
      if (row.isDefault) {
        throw new BadRequestException(
          'Unset default before deleting this storage provider.',
        );
      }
      const activeObjectCount = await manager
        .getRepository(StorageObject)
        .count({
          where: { providerId: id, status: 'ACTIVE' },
        });
      if (activeObjectCount > 0) {
        throw new BadRequestException(
          'Storage provider has active storage objects and cannot be deleted.',
        );
      }
      await repo.delete({ id });
      await this.audit(
        manager,
        'INTEGRATION_STORAGE_PROVIDER_DELETED',
        actor,
        row,
      );
      return { deleted: true };
    });
  }

  async setDefault(
    id: string,
    actor: JwtUserPayload,
  ): Promise<PlatformStorageProviderResponse> {
    return this.providerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PlatformStorageProvider);
      const row = await this.findByIdOrThrow(id, repo);
      if (row.status !== 'active') {
        throw new BadRequestException(
          'Only active storage providers can be default.',
        );
      }
      await this.clearDefault(manager);
      row.isDefault = true;
      row.updatedBy = actor.sub;
      const saved = await this.saveOrConflict(repo, row);
      await this.audit(
        manager,
        'INTEGRATION_STORAGE_PROVIDER_DEFAULT_CHANGED',
        actor,
        saved,
      );
      return this.toResponse(saved);
    });
  }

  async enable(
    id: string,
    actor: JwtUserPayload,
  ): Promise<PlatformStorageProviderResponse> {
    return this.update(id, { status: 'active' }, actor);
  }

  async disable(
    id: string,
    actor: JwtUserPayload,
  ): Promise<PlatformStorageProviderResponse> {
    return this.update(id, { status: 'inactive' }, actor);
  }

  async testConnection(
    id: string,
    actor: JwtUserPayload,
  ): Promise<StorageProviderConnectionTestResponse> {
    const startedAt = Date.now();
    const row = await this.findByIdOrThrow(id);
    const config = this.toRuntimeConfig(row);
    if (config.type === 'S3_COMPATIBLE') {
      await this.endpointSecurity.assertResolvedEndpointSafe(
        config.endpoint,
        'S3-compatible storage endpoint',
      );
    }
    let healthStatus: PlatformStorageProviderHealthStatus = 'HEALTHY';
    const checkedAt = new Date();
    let latencyMs = 0;
    let message = 'Storage provider connection verified.';

    try {
      const result = await this.adapter.testConnection(config);
      latencyMs = result.latencyMs;
      message = result.message;
    } catch (error) {
      latencyMs = Math.max(Date.now() - startedAt, 0);
      message = this.sanitizeStorageProviderError(error);
      healthStatus = 'UNHEALTHY';
      this.logger.warn({
        event: 'storage_provider_connection_test_failed',
        providerId: row.id,
        providerType: row.type,
        mode: row.mode,
        message,
      });
    }

    return this.providerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PlatformStorageProvider);
      const current = await this.findByIdOrThrow(id, repo);
      current.healthStatus = healthStatus;
      current.lastCheckedAt = checkedAt;
      current.lastLatencyMs = latencyMs;
      current.healthMessage = message;
      current.updatedBy = actor.sub;
      if (healthStatus === 'HEALTHY') current.lastSuccessfulCheckAt = checkedAt;
      else current.lastFailedCheckAt = checkedAt;

      const saved = await repo.save(current);
      await this.audit(
        manager,
        'INTEGRATION_STORAGE_PROVIDER_CONNECTION_TESTED',
        actor,
        saved,
        {
          ok: saved.healthStatus === 'HEALTHY',
          latencyMs: saved.lastLatencyMs,
        },
      );
      return {
        success: saved.healthStatus === 'HEALTHY',
        ok: saved.healthStatus === 'HEALTHY',
        provider: this.toResponse(saved),
        latencyMs: saved.lastLatencyMs ?? 0,
        message: saved.healthMessage ?? 'Storage provider test completed.',
      };
    });
  }

  private normalizeCreate(
    dto: CreatePlatformStorageProviderDto,
  ): NormalizedStorageProvider {
    const status = dto.status ?? 'active';
    const isDefault = dto.isDefault === true;
    if (isDefault && status !== 'active') {
      throw new BadRequestException(
        'Only active storage providers can be default.',
      );
    }
    return {
      name: dto.name.trim(),
      type: dto.type,
      status,
      isDefault,
      mode: dto.mode ?? 'LIVE',
      ...this.normalizeByType(dto.type, dto, null),
    };
  }

  private normalizeUpdate(
    row: PlatformStorageProvider,
    dto: UpdatePlatformStorageProviderDto,
  ): NormalizedStorageProvider {
    if (dto.type && dto.type !== row.type) {
      throw new BadRequestException(
        'Storage provider type cannot be changed after creation.',
      );
    }
    return {
      name: dto.name?.trim() ?? row.name,
      type: row.type,
      status: dto.status ?? row.status,
      isDefault: row.isDefault,
      mode: dto.mode ?? row.mode,
      ...this.normalizeByType(row.type, dto, row),
    };
  }

  private normalizeByType(
    type: PlatformStorageProviderType,
    dto: CreatePlatformStorageProviderDto | UpdatePlatformStorageProviderDto,
    existing: PlatformStorageProvider | null,
  ): Pick<NormalizedStorageProvider, 'configuration' | 'credentials'> {
    if (type === 'LOCAL') return this.normalizeLocal(dto, existing);
    return this.normalizeS3Compatible(dto, existing);
  }

  private normalizeLocal(
    dto: CreatePlatformStorageProviderDto | UpdatePlatformStorageProviderDto,
    existing: PlatformStorageProvider | null,
  ): Pick<NormalizedStorageProvider, 'configuration' | 'credentials'> {
    const existingConfig = existing?.configuration as
      | LocalStorageProviderConfig
      | undefined;
    if (dto.endpoint || dto.region || dto.bucketName) {
      throw new BadRequestException(
        'Local storage providers do not accept endpoint, region, or bucket settings.',
      );
    }
    if (dto.accessKeyId || dto.secretAccessKey) {
      throw new BadRequestException(
        'Local storage providers do not accept access keys.',
      );
    }
    return {
      configuration: {
        publicBaseUrl: this.normalizeOptionalPublicBaseUrl(
          dto.publicBaseUrl,
          existingConfig?.publicBaseUrl ?? null,
        ),
      } satisfies LocalStorageProviderConfig,
      credentials: {},
    };
  }

  private normalizeS3Compatible(
    dto: CreatePlatformStorageProviderDto | UpdatePlatformStorageProviderDto,
    existing: PlatformStorageProvider | null,
  ): Pick<NormalizedStorageProvider, 'configuration' | 'credentials'> {
    const existingConfig = existing?.configuration as
      | S3CompatibleStorageProviderConfig
      | undefined;
    const existingCredentials = existing?.credentials as
      | S3CompatibleStorageProviderCredentials
      | undefined;
    const endpoint = dto.endpoint ?? existingConfig?.endpoint ?? '';
    const region = dto.region ?? existingConfig?.region ?? 'auto';
    const bucketName = dto.bucketName ?? existingConfig?.bucketName ?? '';
    const accessKeyId = dto.accessKeyId ?? '';
    const secretAccessKey = dto.secretAccessKey ?? '';
    const credentials: S3CompatibleStorageProviderCredentials = {
      accessKeyId: accessKeyId
        ? this.encryptCredential(accessKeyId.trim(), 'access key ID')
        : existingCredentials?.accessKeyId,
      secretAccessKey: secretAccessKey
        ? this.encryptCredential(secretAccessKey, 'secret access key')
        : existingCredentials?.secretAccessKey,
    };

    this.assertS3CredentialsPresent(credentials);
    return {
      configuration: {
        endpoint: this.normalizeEndpoint(endpoint),
        region: this.normalizeRegion(region),
        bucketName: this.normalizeBucketName(bucketName),
        publicBaseUrl: this.normalizeOptionalPublicBaseUrl(
          dto.publicBaseUrl,
          existingConfig?.publicBaseUrl ?? null,
        ),
      } satisfies S3CompatibleStorageProviderConfig,
      credentials,
    };
  }

  private toRuntimeConfig(
    row: PlatformStorageProvider,
  ): RuntimeStorageProviderConfig {
    if (row.status !== 'active') {
      throw new BadRequestException('Storage provider is inactive.');
    }
    if (row.type === 'LOCAL') {
      const configuration = row.configuration as LocalStorageProviderConfig;
      return {
        providerId: row.id,
        type: 'LOCAL',
        publicBaseUrl: configuration.publicBaseUrl ?? null,
        storageRoot: getBackendStorageRoot(),
        maxWriteBytes: this.localMaxWriteBytes(),
        timeoutMs: STORAGE_PROVIDER_TIMEOUT_MS,
      };
    }

    const configuration =
      row.configuration as S3CompatibleStorageProviderConfig;
    const credentials =
      row.credentials as S3CompatibleStorageProviderCredentials;
    const encryptedAccessKeyId = credentials.accessKeyId;
    const encryptedSecretAccessKey = credentials.secretAccessKey;
    if (
      !this.credentials.isEncrypted(encryptedAccessKeyId) ||
      !this.credentials.isEncrypted(encryptedSecretAccessKey)
    ) {
      throw new BadRequestException(
        'Storage provider credentials are invalid.',
      );
    }
    return {
      providerId: row.id,
      type: 'S3_COMPATIBLE',
      endpoint: configuration.endpoint,
      region: configuration.region,
      bucketName: configuration.bucketName,
      accessKeyId: this.credentials.decrypt(encryptedAccessKeyId as string),
      secretAccessKey: this.credentials.decrypt(
        encryptedSecretAccessKey as string,
      ),
      publicBaseUrl: configuration.publicBaseUrl ?? null,
      timeoutMs: STORAGE_PROVIDER_TIMEOUT_MS,
    };
  }

  private localMaxWriteBytes(): number {
    const raw = process.env.PLATFORM_STORAGE_LOCAL_MAX_WRITE_BYTES;
    const parsed = raw ? Number.parseInt(raw, 10) : undefined;
    return parsed && Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES;
  }

  private encryptCredential(value: string, label: string): string {
    if (!this.credentials.isConfigured()) {
      throw new BadRequestException(
        `CONFIG_ENCRYPTION_KEY is required before saving storage provider ${label}.`,
      );
    }
    return this.credentials.encrypt(value);
  }

  private assertS3CredentialsPresent(
    credentials: S3CompatibleStorageProviderCredentials,
  ): void {
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new BadRequestException(
        'S3-compatible storage providers require accessKeyId and secretAccessKey.',
      );
    }
  }

  private normalizeEndpoint(raw: string): string {
    const value = raw.trim();
    if (!value) {
      throw new BadRequestException(
        'S3-compatible storage endpoint is required.',
      );
    }
    const url = this.parseSafeUrl(value, 'S3-compatible storage endpoint');
    if (url.pathname && url.pathname !== '/') {
      throw new BadRequestException(
        'S3-compatible storage endpoint must not include a path.',
      );
    }
    if (url.search || url.hash) {
      throw new BadRequestException(
        'S3-compatible storage endpoint must not include query or fragment values.',
      );
    }
    return url.toString().replace(/\/$/, '');
  }

  private normalizeOptionalPublicBaseUrl(
    raw: string | undefined,
    fallback: string | null = null,
  ): string | null {
    if (raw === undefined) return fallback;
    const value = raw?.trim() ?? '';
    if (!value) return null;
    const url = this.parseSafeUrl(value, 'Public base URL');
    if (url.search || url.hash) {
      throw new BadRequestException(
        'Public base URL must not include query or fragment values.',
      );
    }
    return url.toString().replace(/\/$/, '');
  }

  private parseSafeUrl(raw: string, label: string): URL {
    return this.endpointSecurity.parseSafeUrl(raw, label);
  }

  private normalizeRegion(raw: string): string {
    const value = raw.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,32}$/.test(value)) {
      throw new BadRequestException('Storage region is invalid.');
    }
    return value;
  }

  private normalizeBucketName(raw: string): string {
    const value = raw.trim();
    if (
      !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) ||
      value.includes('..') ||
      value.includes('-.') ||
      value.includes('.-') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(value)
    ) {
      throw new BadRequestException('Storage bucket name is invalid.');
    }
    return value;
  }

  private async assertResolvedEndpointSafe(
    normalized: NormalizedStorageProvider,
  ): Promise<void> {
    if (normalized.type !== 'S3_COMPATIBLE') return;
    const configuration =
      normalized.configuration as S3CompatibleStorageProviderConfig;
    await this.endpointSecurity.assertResolvedEndpointSafe(
      configuration.endpoint,
      'S3-compatible storage endpoint',
    );
    if (configuration.publicBaseUrl) {
      await this.endpointSecurity.assertResolvedEndpointSafe(
        configuration.publicBaseUrl,
        'Public base URL',
      );
    }
  }

  private async clearDefault(manager: EntityManager): Promise<void> {
    await manager
      .getRepository(PlatformStorageProvider)
      .update({ isDefault: true }, { isDefault: false });
  }

  private async findByIdOrThrow(
    id: string,
    repo: Repository<PlatformStorageProvider> = this.providerRepository,
  ): Promise<PlatformStorageProvider> {
    const row = await repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Storage provider not found.');
    return row;
  }

  private async saveOrConflict(
    repo: Repository<PlatformStorageProvider>,
    row: PlatformStorageProvider,
  ): Promise<PlatformStorageProvider> {
    try {
      return await repo.save(row);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === '23505') {
        throw new ConflictException('Storage provider uniqueness conflict.');
      }
      throw error;
    }
  }

  private sanitizeStorageProviderError(error: unknown): string {
    const message = String((error as { message?: string })?.message ?? '')
      .toLowerCase()
      .slice(0, 500);
    const name = String((error as { name?: string })?.name ?? '').toLowerCase();
    if (message.includes('timed out') || message.includes('timeout')) {
      return 'Storage provider connection timed out.';
    }
    if (
      message.includes('forbidden') ||
      message.includes('unauthorized') ||
      message.includes('signature') ||
      message.includes('accessdenied') ||
      name.includes('accessdenied')
    ) {
      return 'Storage provider authentication failed.';
    }
    if (
      message.includes('not found') ||
      message.includes('nosuchbucket') ||
      name.includes('nosuchbucket')
    ) {
      return 'Storage bucket was not found.';
    }
    if (message.includes('certificate') || message.includes('tls')) {
      return 'Storage provider TLS verification failed.';
    }
    return 'Storage provider connection failed.';
  }

  private toResponse(
    row: PlatformStorageProvider,
  ): PlatformStorageProviderResponse {
    const credentials =
      row.credentials as S3CompatibleStorageProviderCredentials;
    const configuration = row.configuration as
      | LocalStorageProviderConfig
      | S3CompatibleStorageProviderConfig;
    const s3 =
      row.type === 'S3_COMPATIBLE'
        ? (configuration as S3CompatibleStorageProviderConfig)
        : null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      isDefault: row.isDefault,
      mode: row.mode,
      endpoint: s3?.endpoint ?? null,
      region: s3?.region ?? null,
      bucketName: s3?.bucketName ?? null,
      publicBaseUrl: configuration.publicBaseUrl ?? null,
      accessKeyIdConfigured: Boolean(credentials?.accessKeyId),
      secretAccessKeyConfigured: Boolean(credentials?.secretAccessKey),
      healthStatus: row.healthStatus,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
      lastSuccessfulCheckAt: row.lastSuccessfulCheckAt?.toISOString() ?? null,
      lastFailedCheckAt: row.lastFailedCheckAt?.toISOString() ?? null,
      lastLatencyMs: row.lastLatencyMs,
      healthMessage: row.healthMessage,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async audit(
    manager: EntityManager,
    action: StorageProviderAction,
    actor: JwtUserPayload,
    row: PlatformStorageProvider,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await manager.getRepository(AuditLog).save({
      tenantId: null,
      actorUserId: actor.sub,
      action,
      metadata: {
        providerId: row.id,
        providerName: row.name,
        providerType: row.type,
        mode: row.mode,
        status: row.status,
        isDefault: row.isDefault,
        healthStatus: row.healthStatus,
        ...extra,
      },
    });
  }

  private changedFields(dto: UpdatePlatformStorageProviderDto): string[] {
    return Object.entries(dto)
      .filter(
        ([key, value]) =>
          !['accessKeyId', 'secretAccessKey'].includes(key) &&
          value !== undefined,
      )
      .map(([key]) => key);
  }

  private isMissingProviderTable(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message ?? '');
    return code === '42P01' && message.includes('platform_storage_providers');
  }
}
