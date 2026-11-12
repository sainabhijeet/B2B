import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type {
  PlatformStorageProvider,
  S3CompatibleStorageProviderConfig,
} from '../../common/entities/platform-storage-provider.entity';
import { LocalStorageRuntimeAdapter } from './local-storage-runtime.adapter';

export type RuntimeStorageProviderConfig =
  | {
      providerId: string;
      type: 'LOCAL';
      publicBaseUrl: string | null;
      storageRoot: string;
      maxWriteBytes: number;
      timeoutMs: number;
    }
  | {
      providerId: string;
      type: 'S3_COMPATIBLE';
      endpoint: string;
      region: string;
      bucketName: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicBaseUrl: string | null;
      timeoutMs: number;
    };

export type StorageProviderTestConnectionResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

@Injectable()
export class StorageProviderAdapter {
  async testConnection(
    config: RuntimeStorageProviderConfig,
  ): Promise<StorageProviderTestConnectionResult> {
    if (config.type === 'LOCAL') return this.testLocal(config);
    return this.testS3Compatible(config);
  }

  private async testLocal(
    config: Extract<RuntimeStorageProviderConfig, { type: 'LOCAL' }>,
  ): Promise<StorageProviderTestConnectionResult> {
    const startedAt = Date.now();
    const adapter = new LocalStorageRuntimeAdapter(
      config.storageRoot,
      config.publicBaseUrl,
      config.maxWriteBytes,
    );
    const health = await this.withTimeout(
      adapter.healthCheck(),
      config.timeoutMs,
    );
    if (!health.ok) {
      throw new Error(health.message);
    }
    return {
      ok: true,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      message: 'Local storage capability verified.',
    };
  }

  private async testS3Compatible(
    config: Extract<RuntimeStorageProviderConfig, { type: 'S3_COMPATIBLE' }>,
  ): Promise<StorageProviderTestConnectionResult> {
    const startedAt = Date.now();
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), config.timeoutMs);
    try {
      await client.send(
        new HeadBucketCommand({
          Bucket: config.bucketName,
        }),
        { abortSignal: abortController.signal },
      );
      return {
        ok: true,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        message: 'S3-compatible bucket access verified.',
      };
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        throw new Error('Storage provider connection timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
      client.destroy();
    }
  }

  toS3Configuration(
    row: PlatformStorageProvider,
  ): S3CompatibleStorageProviderConfig {
    return row.configuration as S3CompatibleStorageProviderConfig;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Storage provider connection timed out.')),
        timeoutMs,
      );
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }
}
