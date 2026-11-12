import { ConfigService } from '@nestjs/config';
import { createRequiredAppQueue } from '../../workers/queue-factory';
import { MediaScanQueueService } from './media-scan-queue.service';

jest.mock('../../workers/queue-factory', () => ({
  createAppQueue: jest.fn(),
  createRequiredAppQueue: jest.fn(),
}));
const id = '11111111-1111-4111-8111-111111111111';

describe('MediaScanQueueService', () => {
  it('enqueues the exact identifier-only payload with deterministic bounded options', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'job' });
    (createRequiredAppQueue as jest.Mock).mockReturnValue({
      add,
      close: jest.fn(),
    });
    const service = new MediaScanQueueService({
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService);
    await service.enqueue(id);
    expect(add).toHaveBeenCalledWith(
      'media.scan',
      { storageObjectId: id },
      expect.objectContaining({
        jobId: 'media-scan-' + id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
    expect(Object.keys(add.mock.calls[0][1])).toEqual(['storageObjectId']);
  });
  it('uses the same deterministic job id for duplicate enqueue attempts', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'job' });
    (createRequiredAppQueue as jest.Mock).mockReturnValue({
      add,
      close: jest.fn(),
    });
    const service = new MediaScanQueueService({
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService);
    await service.enqueue(id);
    await service.enqueue(id);
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0][2].jobId).toBe('media-scan-' + id);
    expect(add.mock.calls[1][2].jobId).toBe('media-scan-' + id);
  });

  it('propagates enqueue failures without fabricating success', async () => {
    const add = jest.fn().mockRejectedValue(new Error('redis unavailable'));
    (createRequiredAppQueue as jest.Mock).mockReturnValue({
      add,
      close: jest.fn(),
    });
    const service = new MediaScanQueueService({
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService);
    await expect(service.enqueue(id)).rejects.toThrow('redis unavailable');
  });
});
