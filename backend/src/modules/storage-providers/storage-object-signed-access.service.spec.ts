import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { StorageObjectMetadataResponse } from './storage-objects.service';
import { StorageObjectSignedAccessService } from './storage-object-signed-access.service';

const secret = 'x'.repeat(48);
const object: StorageObjectMetadataResponse = {
  id: '44444444-4444-4444-8444-444444444444',
  tenantId: '11111111-1111-4111-8111-111111111111',
  providerId: null,
  objectKey: 'tenant-media/11111111-1111-4111-8111-111111111111/logo.png',
  originalFilename: 'logo.png',
  mimeType: 'image/png',
  sizeBytes: '4',
  checksumSha256: null,
  ownershipType: 'TENANT',
  objectCategory: 'tenant_media',
  accessScope: 'TENANT_PRIVATE',
  status: 'ACTIVE',
  scanRequired: false,
  scanStatus: 'NOT_REQUIRED',
  scannerProvider: null,
  scannerVerdict: null,
  scanStartedAt: null,
  scannedAt: null,
  scannerErrorCode: null,
  scanAttempts: 0,
  deletedAt: null,
  metadata: {},
  createdAt: new Date('2026-09-09T00:00:00.000Z'),
  updatedAt: new Date('2026-09-09T00:00:00.000Z'),
};

function makeService() {
  return new StorageObjectSignedAccessService({
    get: jest.fn((key: string) =>
      key === 'jwt.accessSecret' ? secret : undefined,
    ),
  } as unknown as ConfigService);
}

function signPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  const signature = createHmac('sha256', `storage-object-read:v1:${secret}`)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

describe('StorageObjectSignedAccessService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates short-lived signed READ access bound to object identity', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const service = makeService();

    const access = service.createReadAccess(object, 120);
    const payload = service.validateReadAccess(access.token, object);

    expect(access.operation).toBe('READ');
    expect(access.expiresInSeconds).toBe(120);
    expect(payload.objectId).toBe(object.id);
    expect(payload.objectKey).toBe(object.objectKey);
    expect(payload.tenantId).toBe(object.tenantId);
    expect(payload.ownershipType).toBe(object.ownershipType);
    expect(access.token).not.toContain(secret);
  });

  it('caps requested TTL to the maximum allowed lifetime', () => {
    const service = makeService();

    const access = service.createReadAccess(object, 999_999);

    expect(access.expiresInSeconds).toBe(900);
  });

  it('rejects expired signed access', () => {
    const service = makeService();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const access = service.createReadAccess(object, 1);
    jest.spyOn(Date, 'now').mockReturnValue(1_002_000);

    expect(() => service.validateReadAccess(access.token, object)).toThrow(
      BadRequestException,
    );
  });

  it('rejects modified signatures', () => {
    const service = makeService();
    const access = service.createReadAccess(object);
    const tampered = `${access.token.slice(0, -1)}x`;

    expect(() => service.validateReadAccess(tampered, object)).toThrow(
      BadRequestException,
    );
  });

  it('rejects wrong operation tokens even with a valid signature', () => {
    const service = makeService();
    const token = signPayload({
      v: 1,
      objectId: object.id,
      objectKey: object.objectKey,
      tenantId: object.tenantId,
      ownershipType: object.ownershipType,
      op: 'WRITE',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'abcdefghijklmnop',
    });

    expect(() => service.validateReadAccess(token, object)).toThrow(
      BadRequestException,
    );
  });

  it('rejects object binding mismatches', () => {
    const service = makeService();
    const access = service.createReadAccess(object);

    expect(() =>
      service.validateReadAccess(access.token, {
        ...object,
        objectKey: 'tenant-media/other/logo.png',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects malformed tokens with safe errors', () => {
    const service = makeService();

    expect(() => service.validateReadAccess('not-a-token', object)).toThrow(
      BadRequestException,
    );
  });
});
