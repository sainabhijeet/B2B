import { Readable } from 'node:stream';

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');

export type ObjectStoragePutInput = {
  key: string;
  body: Readable;
  contentLength: number;
  contentType: string;
  sha256: string;
};

export type ObjectStorageHead = {
  key: string;
  contentLength: number;
  contentType: string | null;
  etag: string | null;
  sha256: string | null;
};

export type ObjectStorageHealth = {
  configured: boolean;
  reachable: boolean;
  provider: 's3-compatible';
  bucket: string | null;
  errorType: string | null;
};

export interface ObjectStoragePort {
  isConfigured(): boolean;
  putImmutable(input: ObjectStoragePutInput): Promise<ObjectStorageHead>;
  head(key: string): Promise<ObjectStorageHead | null>;
  getStream(key: string): Promise<Readable>;
  healthCheck(): Promise<ObjectStorageHealth>;
}
