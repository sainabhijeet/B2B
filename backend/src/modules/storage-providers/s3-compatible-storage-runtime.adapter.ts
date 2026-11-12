import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import {
  PlatformStorageAdapter,
  StorageObjectHead,
  StorageObjectPutInput,
  StorageRuntimeHealth,
} from './storage-runtime.types';

export type S3CompatibleRuntimeAdapterConfig = {
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
  timeoutMs: number;
};

type S3RuntimeClient = Pick<S3Client, 'send' | 'destroy'>;

function sanitizeStorageError(error: unknown): Error {
  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const code = candidate.name ?? candidate.Code ?? candidate.code;
  const statusCode = candidate.$metadata?.httpStatusCode;

  if (code === 'AbortError') {
    return new Error('Storage operation timed out.');
  }
  if (statusCode === 401 || statusCode === 403 || code === 'AccessDenied') {
    return new Error(
      'Storage provider authentication or authorization failed.',
    );
  }
  if (statusCode === 404 || code === 'NotFound' || code === 'NoSuchBucket') {
    return new Error('Storage bucket or object was not found.');
  }
  if (code === 'NetworkingError' || code === 'TimeoutError') {
    return new Error('Storage provider network request failed.');
  }
  return new Error('Storage operation failed.');
}

function toReadable(body: unknown): Readable {
  if (body instanceof Readable) return body;
  if (
    body &&
    typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] ===
      'function'
  ) {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }
  return Readable.from(Buffer.alloc(0));
}

export class S3CompatibleStorageRuntimeAdapter implements PlatformStorageAdapter {
  readonly type = 'S3_COMPATIBLE' as const;
  readonly publicBaseUrl: string | null;
  private readonly timeoutMs: number;
  private readonly bucketName: string;
  private readonly client: S3RuntimeClient;

  constructor(
    config: S3CompatibleRuntimeAdapterConfig,
    client?: S3RuntimeClient,
  ) {
    this.publicBaseUrl = config.publicBaseUrl;
    this.timeoutMs = config.timeoutMs;
    this.bucketName = config.bucketName;
    Object.defineProperty(this, 'client', {
      value:
        client ??
        new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle: true,
        }),
      enumerable: false,
    });
  }

  async put(input: StorageObjectPutInput): Promise<StorageObjectHead> {
    await this.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.body,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
      }),
    );
    const head = await this.head(input.key);
    if (!head) throw new Error('Storage object write verification failed.');
    return head;
  }

  async putIfAbsent(input: StorageObjectPutInput): Promise<StorageObjectHead> {
    try {
      await this.sendRaw(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
          Body: input.body,
          ContentLength: input.contentLength,
          ContentType: input.contentType,
          IfNoneMatch: '*',
        }),
      );
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      if (status === 412) throw new Error('Storage object already exists.');
      throw sanitizeStorageError(error);
    }
    const head = await this.head(input.key);
    if (!head) throw new Error('Storage object write verification failed.');
    return head;
  }

  async getStream(key: string): Promise<Readable> {
    const response = await this.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    return toReadable((response as { Body?: unknown }).Body);
  }

  async head(key: string): Promise<StorageObjectHead | null> {
    try {
      const response = (await this.sendRaw(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      )) as {
        ContentLength?: number;
        ContentType?: string;
        ETag?: string;
        LastModified?: Date;
      };
      return {
        key,
        contentLength: response.ContentLength ?? null,
        contentType: response.ContentType ?? null,
        etag: response.ETag ?? null,
        lastModified: response.LastModified ?? null,
      };
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      const name = (error as { name?: string })?.name;
      if (statusCode === 404 || name === 'NotFound' || name === 'NoSuchKey') {
        return null;
      }
      throw sanitizeStorageError(error);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    await this.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  async healthCheck(): Promise<StorageRuntimeHealth> {
    const startedAt = Date.now();
    try {
      await this.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return {
        status: 'HEALTHY',
        ok: true,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        message: 'S3-compatible bucket access verified.',
      };
    } catch (error) {
      const sanitized =
        error instanceof Error && error.message.startsWith('Storage ')
          ? error
          : sanitizeStorageError(error);
      return {
        status: 'UNHEALTHY',
        ok: false,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        message: sanitized.message,
      };
    }
  }

  destroy(): void {
    this.client.destroy();
  }

  private async send(command: object): Promise<unknown> {
    try {
      return await this.sendRaw(command);
    } catch (error) {
      throw sanitizeStorageError(error);
    }
  }

  private async sendRaw(command: object): Promise<unknown> {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), this.timeoutMs);
    try {
      return await this.client.send(command as never, {
        abortSignal: abortController.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
