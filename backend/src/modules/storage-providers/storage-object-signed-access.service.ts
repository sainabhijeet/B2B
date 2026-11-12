import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { StorageObjectMetadataResponse } from './storage-objects.service';

export type SignedStorageObjectOperation = 'READ';

type SignedStorageObjectPayload = {
  v: 1;
  objectId: string;
  objectKey: string;
  tenantId: string | null;
  ownershipType: 'PLATFORM' | 'TENANT';
  op: SignedStorageObjectOperation;
  iat: number;
  exp: number;
  nonce: string;
};

export type SignedStorageObjectAccess = {
  token: string;
  expiresAt: Date;
  expiresInSeconds: number;
  operation: SignedStorageObjectOperation;
};

const DEFAULT_READ_TTL_SECONDS = 300;
const MAX_READ_TTL_SECONDS = 900;
const MAX_TOKEN_LENGTH = 4096;

@Injectable()
export class StorageObjectSignedAccessService {
  constructor(private readonly configService: ConfigService) {}

  createReadAccess(
    object: StorageObjectMetadataResponse,
    ttlSeconds = DEFAULT_READ_TTL_SECONDS,
  ): SignedStorageObjectAccess {
    const boundedTtl = this.boundTtl(ttlSeconds);
    const now = this.nowSeconds();
    const payload: SignedStorageObjectPayload = {
      v: 1,
      objectId: object.id,
      objectKey: object.objectKey,
      tenantId: object.tenantId,
      ownershipType: object.ownershipType,
      op: 'READ',
      iat: now,
      exp: now + boundedTtl,
      nonce: randomBytes(16).toString('base64url'),
    };
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    return {
      token: `${body}.${this.sign(body)}`,
      expiresAt: new Date(payload.exp * 1000),
      expiresInSeconds: boundedTtl,
      operation: 'READ',
    };
  }

  validateReadAccess(
    token: string,
    object: StorageObjectMetadataResponse,
  ): SignedStorageObjectPayload {
    const payload = this.validateToken(token);
    if (payload.op !== 'READ') {
      throw new BadRequestException('Storage object access token is invalid.');
    }
    if (
      payload.objectId !== object.id ||
      payload.objectKey !== object.objectKey ||
      payload.tenantId !== object.tenantId ||
      payload.ownershipType !== object.ownershipType
    ) {
      throw new BadRequestException('Storage object access token is invalid.');
    }
    return payload;
  }

  private validateToken(token: string): SignedStorageObjectPayload {
    const value = token.trim();
    if (!value || value.length > MAX_TOKEN_LENGTH) {
      throw new BadRequestException('Storage object access token is invalid.');
    }
    const parts = value.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new BadRequestException('Storage object access token is invalid.');
    }
    const [body, signature] = parts;
    if (!this.signatureMatches(body, signature)) {
      throw new BadRequestException('Storage object access token is invalid.');
    }

    let payload: SignedStorageObjectPayload;
    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as SignedStorageObjectPayload;
    } catch {
      throw new BadRequestException('Storage object access token is invalid.');
    }

    if (!this.isValidPayload(payload)) {
      throw new BadRequestException('Storage object access token is invalid.');
    }
    if (payload.exp <= this.nowSeconds()) {
      throw new BadRequestException('Storage object access token has expired.');
    }
    return payload;
  }

  private signatureMatches(body: string, signature: string): boolean {
    if (!/^[A-Za-z0-9_-]+$/.test(signature)) return false;

    const expected = Buffer.from(this.sign(body), 'base64url');
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      return false;
    }
    if (actual.toString('base64url') !== signature) return false;
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private sign(body: string): string {
    return createHmac('sha256', this.signingSecret())
      .update(body)
      .digest('base64url');
  }

  private signingSecret(): string {
    const secret = this.configService.get<string>('jwt.accessSecret') ?? '';
    if (secret.length < 32) {
      throw new BadRequestException(
        'Storage object signing secret is not configured.',
      );
    }
    return `storage-object-read:v1:${secret}`;
  }

  private boundTtl(value: number): number {
    if (!Number.isInteger(value) || value <= 0) return DEFAULT_READ_TTL_SECONDS;
    return Math.min(value, MAX_READ_TTL_SECONDS);
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  private isValidPayload(
    payload: SignedStorageObjectPayload,
  ): payload is SignedStorageObjectPayload {
    return (
      payload?.v === 1 &&
      typeof payload.objectId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.objectId,
      ) &&
      typeof payload.objectKey === 'string' &&
      payload.objectKey.length > 0 &&
      (typeof payload.tenantId === 'string' || payload.tenantId === null) &&
      (payload.ownershipType === 'PLATFORM' ||
        payload.ownershipType === 'TENANT') &&
      payload.op === 'READ' &&
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      payload.exp > payload.iat &&
      typeof payload.nonce === 'string' &&
      /^[A-Za-z0-9_-]{16,64}$/.test(payload.nonce)
    );
  }
}
