import { HeadBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { S3CompatibleStorageRuntimeAdapter } from './s3-compatible-storage-runtime.adapter';

function makeClient(send: jest.Mock) {
  return {
    send,
    destroy: jest.fn(),
  };
}

function makeAdapter(send: jest.Mock) {
  return new S3CompatibleStorageRuntimeAdapter(
    {
      endpoint: 'https://account.r2.cloudflarestorage.com',
      region: 'auto',
      bucketName: 'platform-assets',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      publicBaseUrl: 'https://cdn.example.com',
      timeoutMs: 500,
    },
    makeClient(send) as never,
  );
}

describe('S3CompatibleStorageRuntimeAdapter', () => {
  it('performs a non-mutating HeadBucket health check', async () => {
    const send = jest.fn().mockResolvedValue({});
    const adapter = makeAdapter(send);

    const health = await adapter.healthCheck();

    expect(health.ok).toBe(true);
    expect(health.status).toBe('HEALTHY');
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
  });

  it('sanitizes S3 health errors without exposing credentials', async () => {
    const send = jest.fn().mockRejectedValue({
      name: 'AccessDenied',
      message: 'access-key secret-key Authorization failed',
      $metadata: { httpStatusCode: 403 },
    });
    const adapter = makeAdapter(send);

    const health = await adapter.healthCheck();

    expect(health.ok).toBe(false);
    expect(health.status).toBe('UNHEALTHY');
    expect(health.message).toBe(
      'Storage provider authentication or authorization failed.',
    );
    expect(JSON.stringify(health)).not.toContain('secret-key');
    expect(JSON.stringify(health)).not.toContain('Authorization failed');
  });

  it('returns null for missing object metadata', async () => {
    const send = jest.fn().mockRejectedValue({
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    const adapter = makeAdapter(send);

    await expect(adapter.head('missing.txt')).resolves.toBeNull();
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
  });

  it('does not expose S3 credentials through public adapter metadata', () => {
    const adapter = makeAdapter(jest.fn());

    const serialized = JSON.stringify(adapter);

    expect(serialized).not.toContain('access-key');
    expect(serialized).not.toContain('secret-key');
  });
});
