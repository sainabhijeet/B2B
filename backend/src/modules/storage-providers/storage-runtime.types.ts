import type { Readable } from 'node:stream';
import type {
  PlatformStorageProviderHealthStatus,
  PlatformStorageProviderType,
} from '../../common/entities/platform-storage-provider.entity';

export type StorageRuntimeSource = 'db' | 'env' | 'local';

export type StorageObjectPutInput = {
  key: string;
  body: Readable | Buffer | string;
  contentLength?: number;
  contentType?: string;
};

export type StorageObjectHead = {
  key: string;
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
  lastModified: Date | null;
};

export type StorageRuntimeHealth = {
  status: PlatformStorageProviderHealthStatus;
  ok: boolean;
  latencyMs: number;
  message: string;
};

export type StorageRuntimeProviderMetadata = {
  source: StorageRuntimeSource;
  providerId: string | null;
  providerName: string;
  type: PlatformStorageProviderType;
  status: 'active' | 'inactive';
  isDefault: boolean;
  healthStatus: PlatformStorageProviderHealthStatus;
  mode: 'TEST' | 'LIVE';
  bucketName: string | null;
  region: string | null;
  endpointHost: string | null;
  publicBaseUrl: string | null;
  runtimeEnabled: boolean;
  warnings: string[];
};

export type StorageRuntimeResolution = {
  metadata: StorageRuntimeProviderMetadata;
  adapter: PlatformStorageAdapter;
};

export interface PlatformStorageAdapter {
  readonly type: PlatformStorageProviderType;
  readonly publicBaseUrl: string | null;
  put(input: StorageObjectPutInput): Promise<StorageObjectHead>;
  putIfAbsent?(input: StorageObjectPutInput): Promise<StorageObjectHead>;
  getStream(key: string): Promise<Readable>;
  head(key: string): Promise<StorageObjectHead | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  healthCheck(): Promise<StorageRuntimeHealth>;
}
