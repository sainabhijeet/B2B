import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlatformStorageProvider,
  S3CompatibleStorageProviderConfig,
  S3CompatibleStorageProviderCredentials,
} from '../../common/entities/platform-storage-provider.entity';
import { CredentialEncryptionService } from '../../common/security/credential-encryption.service';
import { getBackendStorageRoot } from '../../common/utils/storage-root';
import {
  DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES,
  LocalStorageRuntimeAdapter,
} from './local-storage-runtime.adapter';
import { S3CompatibleStorageRuntimeAdapter } from './s3-compatible-storage-runtime.adapter';
import { StorageEndpointSecurityService } from './storage-endpoint-security.service';
import {
  PlatformStorageAdapter,
  StorageRuntimeHealth,
  StorageRuntimeProviderMetadata,
  StorageRuntimeResolution,
  StorageRuntimeSource,
} from './storage-runtime.types';

const STORAGE_RUNTIME_TIMEOUT_MS = 5000;

@Injectable()
export class PlatformStorageRuntimeService {
  constructor(
    @InjectRepository(PlatformStorageProvider)
    private readonly providerRepository: Repository<PlatformStorageProvider>,
    private readonly configService: ConfigService,
    private readonly credentials: CredentialEncryptionService,
    private readonly endpointSecurity: StorageEndpointSecurityService,
  ) {}

  async resolveProvider(): Promise<StorageRuntimeResolution> {
    const runtimeEnabled = this.isRuntimeEnabled();
    if (!runtimeEnabled) {
      return this.createLocalResolution(runtimeEnabled, [
        'PLATFORM_STORAGE_RUNTIME_ENABLED is disabled; existing local filesystem runtime remains authoritative.',
      ]);
    }

    const dbProvider =
      await this.resolveDatabaseDefaultProvider(runtimeEnabled);
    if (dbProvider) return dbProvider;

    const envProvider = await this.resolveEnvironmentProvider(runtimeEnabled);
    if (envProvider) return envProvider;

    return this.createLocalResolution(runtimeEnabled);
  }

  async getProviderMetadata(): Promise<StorageRuntimeProviderMetadata> {
    return (await this.resolveProvider()).metadata;
  }

  async healthCheck(): Promise<{
    metadata: StorageRuntimeProviderMetadata;
    health: StorageRuntimeHealth;
  }> {
    const resolution = await this.resolveProvider();
    return {
      metadata: resolution.metadata,
      health: await resolution.adapter.healthCheck(),
    };
  }

  invalidateCache(): void {
    // Reserved for future distributed runtime caching. Phase 2 resolution is
    // intentionally fresh so provider status/default changes are visible.
  }

  private async resolveDatabaseDefaultProvider(
    runtimeEnabled: boolean,
  ): Promise<StorageRuntimeResolution | null> {
    try {
      const row = await this.providerRepository.findOne({
        where: { isDefault: true, status: 'active' },
        order: { updatedAt: 'DESC' },
      });
      return row ? await this.toDatabaseResolution(row, runtimeEnabled) : null;
    } catch (error) {
      if (this.isMissingProviderTable(error)) return null;
      throw error;
    }
  }

  private async toDatabaseResolution(
    row: PlatformStorageProvider,
    runtimeEnabled: boolean,
  ): Promise<StorageRuntimeResolution> {
    if (row.status !== 'active') {
      throw new BadRequestException('Storage provider is inactive.');
    }

    if (row.type === 'LOCAL') {
      const configuration = row.configuration as { publicBaseUrl?: string };
      const adapter = new LocalStorageRuntimeAdapter(
        getBackendStorageRoot(),
        configuration.publicBaseUrl ?? null,
        this.localMaxWriteBytes(),
      );
      return this.createResolution({
        source: 'db',
        runtimeEnabled,
        row,
        adapter,
        publicBaseUrl: configuration.publicBaseUrl ?? null,
      });
    }

    if (row.type !== 'S3_COMPATIBLE') {
      throw new BadRequestException('Unsupported storage provider type.');
    }

    const configuration =
      row.configuration as S3CompatibleStorageProviderConfig;
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
    const rowCredentials =
      row.credentials as S3CompatibleStorageProviderCredentials;
    const accessKeyId = rowCredentials.accessKeyId ?? '';
    const secretAccessKey = rowCredentials.secretAccessKey ?? '';
    if (
      !this.credentials.isEncrypted(accessKeyId) ||
      !this.credentials.isEncrypted(secretAccessKey)
    ) {
      throw new BadRequestException(
        'Storage provider credentials are invalid.',
      );
    }

    const adapter = new S3CompatibleStorageRuntimeAdapter({
      endpoint: configuration.endpoint,
      region: configuration.region,
      bucketName: configuration.bucketName,
      accessKeyId: this.credentials.decrypt(accessKeyId),
      secretAccessKey: this.credentials.decrypt(secretAccessKey),
      publicBaseUrl: configuration.publicBaseUrl ?? null,
      timeoutMs: STORAGE_RUNTIME_TIMEOUT_MS,
    });

    return this.createResolution({
      source: 'db',
      runtimeEnabled,
      row,
      adapter,
      publicBaseUrl: configuration.publicBaseUrl ?? null,
      bucketName: configuration.bucketName,
      region: configuration.region,
      endpoint: configuration.endpoint,
    });
  }

  private async resolveEnvironmentProvider(
    runtimeEnabled: boolean,
  ): Promise<StorageRuntimeResolution | null> {
    const accountId = this.configService.get<string>('r2.accountId', '') ?? '';
    const accessKeyId =
      this.configService.get<string>('r2.accessKeyId', '') ?? '';
    const secretAccessKey =
      this.configService.get<string>('r2.secretAccessKey', '') ?? '';
    const bucketName = this.configService.get<string>('r2.bucket', '') ?? '';
    const publicBaseUrl =
      this.configService.get<string>('r2.publicBaseUrl', '') ?? '';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return null;
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    await this.endpointSecurity.assertResolvedEndpointSafe(
      endpoint,
      'S3-compatible storage endpoint',
    );
    if (publicBaseUrl) {
      await this.endpointSecurity.assertResolvedEndpointSafe(
        publicBaseUrl,
        'Public base URL',
      );
    }
    const adapter = new S3CompatibleStorageRuntimeAdapter({
      endpoint,
      region: 'auto',
      bucketName,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl: publicBaseUrl || null,
      timeoutMs: STORAGE_RUNTIME_TIMEOUT_MS,
    });

    return {
      metadata: {
        source: 'env',
        providerId: null,
        providerName: 'Environment R2 storage',
        type: 'S3_COMPATIBLE',
        status: 'active',
        isDefault: true,
        mode: 'LIVE',
        bucketName,
        region: 'auto',
        endpointHost: this.safeHost(endpoint),
        publicBaseUrl: publicBaseUrl || null,
        healthStatus: 'UNKNOWN',
        runtimeEnabled,
        warnings: [],
      },
      adapter,
    };
  }

  private createLocalResolution(
    runtimeEnabled: boolean,
    warnings: string[] = [],
  ): StorageRuntimeResolution {
    const publicBaseUrl =
      this.configService.get<string>('assets.publicStorageCdnUrl', '') ?? '';
    return {
      metadata: {
        source: 'local',
        providerId: null,
        providerName: 'Local filesystem storage',
        type: 'LOCAL',
        status: 'active',
        isDefault: true,
        mode: 'LIVE',
        bucketName: null,
        region: null,
        endpointHost: null,
        publicBaseUrl: publicBaseUrl || null,
        healthStatus: 'UNKNOWN',
        runtimeEnabled,
        warnings,
      },
      adapter: new LocalStorageRuntimeAdapter(
        getBackendStorageRoot(),
        publicBaseUrl || null,
        this.localMaxWriteBytes(),
      ),
    };
  }

  private createResolution(input: {
    source: StorageRuntimeSource;
    runtimeEnabled: boolean;
    row: PlatformStorageProvider;
    adapter: PlatformStorageAdapter;
    publicBaseUrl: string | null;
    bucketName?: string | null;
    region?: string | null;
    endpoint?: string | null;
  }): StorageRuntimeResolution {
    return {
      metadata: {
        source: input.source,
        providerId: input.row.id,
        providerName: input.row.name,
        type: input.row.type,
        status: input.row.status,
        isDefault: input.row.isDefault,
        mode: input.row.mode,
        bucketName: input.bucketName ?? null,
        region: input.region ?? null,
        endpointHost: input.endpoint ? this.safeHost(input.endpoint) : null,
        publicBaseUrl: input.publicBaseUrl,
        healthStatus: input.row.healthStatus,
        runtimeEnabled: input.runtimeEnabled,
        warnings: [],
      },
      adapter: input.adapter,
    };
  }

  private localMaxWriteBytes(): number {
    const configured = this.configService.get<number>(
      'platformStorageRuntime.localMaxWriteBytes',
      DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES,
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES;
  }

  private isRuntimeEnabled(): boolean {
    return (
      this.configService.get<boolean>('platformStorageRuntime.enabled') === true
    );
  }

  private safeHost(value: string): string | null {
    try {
      return new URL(value).host;
    } catch {
      return null;
    }
  }

  private isMissingProviderTable(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message ?? '');
    return code === '42P01' && message.includes('platform_storage_providers');
  }
}
