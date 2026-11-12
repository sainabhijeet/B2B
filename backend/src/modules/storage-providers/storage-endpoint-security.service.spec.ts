import { BadRequestException } from '@nestjs/common';
import { StorageEndpointSecurityService } from './storage-endpoint-security.service';

function makeService(records: Record<string, string[]>) {
  return new StorageEndpointSecurityService(async (hostname: string) =>
    (records[hostname] ?? ['8.8.8.8']).map(
      (address) =>
        ({ address, family: address.includes(':') ? 6 : 4 }) as const,
    ),
  );
}

describe('StorageEndpointSecurityService', () => {
  it.each([
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'http://10.0.0.1:9000',
    'http://172.16.0.1:9000',
    'http://192.168.1.1:9000',
    'http://[::1]:9000',
    'http://[fc00::1]:9000',
    'http://[fe80::1]:9000',
  ])('rejects unsafe endpoint literal %s', async (endpoint) => {
    const service = makeService({});

    await expect(
      service.assertResolvedEndpointSafe(endpoint, 'S3-compatible endpoint'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects hostnames that resolve to private infrastructure addresses', async () => {
    const service = makeService({ 'storage.example.com': ['10.10.10.10'] });

    await expect(
      service.assertResolvedEndpointSafe(
        'https://storage.example.com',
        'S3-compatible endpoint',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts HTTPS endpoints that resolve only to public addresses', async () => {
    const service = makeService({ 'storage.example.com': ['8.8.8.8'] });

    await expect(
      service.assertResolvedEndpointSafe(
        'https://storage.example.com',
        'S3-compatible endpoint',
      ),
    ).resolves.toBeUndefined();
  });
});
