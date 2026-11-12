import { RequestMethod } from '@nestjs/common';
import { Writable, Readable } from 'node:stream';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { StorageObjectDeliveryController } from './storage-object-delivery.controller';

describe('StorageObjectDeliveryController metadata', () => {
  it('registers the registry-backed storage object route prefix', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, StorageObjectDeliveryController),
    ).toBe('storage-objects');
  });

  it('registers authenticated signed-read creation', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        StorageObjectDeliveryController.prototype.createSignedReadAccess,
      ),
    ).toBe(':id/signed-read');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        StorageObjectDeliveryController.prototype.createSignedReadAccess,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        StorageObjectDeliveryController.prototype.createSignedReadAccess,
      ),
    ).toEqual([JwtAuthGuard]);
  });

  it('registers signed-or-authenticated content delivery', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        StorageObjectDeliveryController.prototype.readContent,
      ),
    ).toBe(':id/content');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        StorageObjectDeliveryController.prototype.readContent,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        StorageObjectDeliveryController.prototype.readContent,
      ),
    ).toEqual([OptionalJwtAuthGuard]);
  });
  it('sets private no-store cache headers on object content responses', async () => {
    const delivery = {
      openReadStream: jest.fn().mockResolvedValue({
        stream: Readable.from(['data']),
        contentType: 'text/plain',
        contentLength: 4,
        etag: null,
        filename: 'file.txt',
      }),
      createSignedReadAccess: jest.fn(),
    };
    const controller = new StorageObjectDeliveryController(delivery as never);
    const headers = new Map<string, string>();
    const response = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    }) as Writable & {
      headersSent: boolean;
      setHeader: jest.Mock;
      status: jest.Mock;
      destroy: jest.Mock;
    };
    response.headersSent = false;
    response.setHeader = jest.fn((key: string, value: string) => {
      headers.set(key, value);
    });
    response.status = jest.fn().mockReturnValue({ end: jest.fn() });
    response.destroy = jest.fn();

    await controller.readContent(
      '11111111-1111-4111-8111-111111111111',
      undefined,
      {
        user: { role: UserRole.SUPER_ADMIN, sub: 'admin', tenantId: null },
      } as never,
      response as never,
    );
    expect(headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
    expect(headers.get('Vary')).toBe('Authorization');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Accept-Ranges')).toBe('none');
  });
});
