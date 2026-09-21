import {
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { ThemeArtifactMetricsService } from './theme-artifact-metrics.service';
import {
  ObjectStorageHead,
  ObjectStorageHealth,
  ObjectStoragePort,
  ObjectStoragePutInput,
} from './object-storage.types';

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate?.$metadata?.httpStatusCode === 404 ||
    candidate?.name === 'NotFound' ||
    candidate?.name === 'NoSuchKey'
  );
}

@Injectable()
export class S3CompatibleObjectStorageService implements ObjectStoragePort {
  private client: S3Client | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: ThemeArtifactMetricsService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('r2.accountId', '').trim() &&
      this.configService.get<string>('r2.accessKeyId', '').trim() &&
      this.configService.get<string>('r2.secretAccessKey', '').trim() &&
      this.configService.get<string>('r2.bucket', '').trim(),
    );
  }

  async putImmutable(input: ObjectStoragePutInput): Promise<ObjectStorageHead> {
    const startedAt = Date.now();
    try {
      const existing = await this.head(input.key);
      if (existing) {
        this.assertMatches(existing, input);
        this.metrics.record(
          'object-storage.put',
          'skipped',
          Date.now() - startedAt,
        );
        return existing;
      }

      await this.clientOrThrow().send(
        new PutObjectCommand({
          Bucket: this.bucket(),
          Key: input.key,
          Body: input.body,
          ContentLength: input.contentLength,
          ContentType: input.contentType,
          Metadata: { sha256: input.sha256 },
        }),
      );
      const stored = await this.head(input.key);
      if (!stored)
        throw new Error('Object storage did not return the uploaded object.');
      this.assertMatches(stored, input);
      this.metrics.record(
        'object-storage.put',
        'success',
        Date.now() - startedAt,
        input.contentLength,
      );
      return stored;
    } catch (error) {
      this.metrics.record(
        'object-storage.put',
        'failure',
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async head(key: string): Promise<ObjectStorageHead | null> {
    const startedAt = Date.now();
    try {
      const response = await this.clientOrThrow().send(
        new HeadObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      this.metrics.record(
        'object-storage.head',
        'success',
        Date.now() - startedAt,
      );
      return {
        key,
        contentLength: response.ContentLength ?? 0,
        contentType: response.ContentType ?? null,
        etag: response.ETag ?? null,
        sha256: response.Metadata?.sha256 ?? null,
      };
    } catch (error) {
      if (isNotFound(error)) {
        this.metrics.record(
          'object-storage.head',
          'skipped',
          Date.now() - startedAt,
        );
        return null;
      }
      this.metrics.record(
        'object-storage.head',
        'failure',
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async getStream(key: string): Promise<Readable> {
    const startedAt = Date.now();
    try {
      const response = await this.clientOrThrow().send(
        new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      if (!response.Body)
        throw new Error('Object storage returned an empty body.');
      this.metrics.record(
        'object-storage.get',
        'success',
        Date.now() - startedAt,
      );
      return Readable.from(response.Body as AsyncIterable<Uint8Array>);
    } catch (error) {
      this.metrics.record(
        'object-storage.get',
        'failure',
        Date.now() - startedAt,
      );
      throw error;
    }
  }

  async healthCheck(): Promise<ObjectStorageHealth> {
    const bucket = this.configService.get<string>('r2.bucket', '').trim();
    if (!this.isConfigured()) {
      return {
        configured: false,
        reachable: false,
        provider: 's3-compatible',
        bucket: bucket || null,
        errorType: 'NotConfigured',
      };
    }
    const startedAt = Date.now();
    try {
      await this.clientOrThrow().send(
        new HeadBucketCommand({ Bucket: bucket }),
      );
      this.metrics.record(
        'object-storage.health',
        'success',
        Date.now() - startedAt,
      );
      return {
        configured: true,
        reachable: true,
        provider: 's3-compatible',
        bucket,
        errorType: null,
      };
    } catch (error) {
      this.metrics.record(
        'object-storage.health',
        'failure',
        Date.now() - startedAt,
      );
      return {
        configured: true,
        reachable: false,
        provider: 's3-compatible',
        bucket,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      };
    }
  }

  private bucket(): string {
    const bucket = this.configService.get<string>('r2.bucket', '').trim();
    if (!bucket) throw new Error('Object storage bucket is not configured.');
    return bucket;
  }

  private clientOrThrow(): S3Client {
    if (!this.isConfigured()) {
      throw new Error('S3-compatible object storage is not configured.');
    }
    if (!this.client) {
      const accountId = this.configService
        .get<string>('r2.accountId', '')
        .trim();
      const accessKeyId = this.configService
        .get<string>('r2.accessKeyId', '')
        .trim();
      const secretAccessKey = this.configService
        .get<string>('r2.secretAccessKey', '')
        .trim();
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.client;
  }

  private assertMatches(
    object: ObjectStorageHead,
    input: ObjectStoragePutInput,
  ): void {
    if (
      object.contentLength !== input.contentLength ||
      object.sha256 !== input.sha256
    ) {
      throw new Error(`Immutable object mismatch for key "${input.key}".`);
    }
  }
}
