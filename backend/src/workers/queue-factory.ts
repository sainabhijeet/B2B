import { ConfigService } from '@nestjs/config';
import { Queue, type QueueOptions } from 'bullmq';

export type AppQueue = {
  add: (name: string, data: unknown, opts?: unknown) => Promise<unknown>;
  close: () => Promise<void>;
  getJobCounts: (...types: string[]) => Promise<Record<string, number>>;
};

class DisabledQueue implements AppQueue {
  async add(): Promise<unknown> {
    return { skipped: true, reason: 'QUEUES_ENABLED=false' };
  }

  async close(): Promise<void> {
    return undefined;
  }

  async getJobCounts(...types: string[]): Promise<Record<string, number>> {
    return Object.fromEntries(types.map((type) => [type, 0]));
  }
}

export function areQueuesEnabled(configService: ConfigService): boolean {
  const raw =
    configService.get<string>('QUEUES_ENABLED') ??
    process.env.QUEUES_ENABLED ??
    (process.env.NODE_ENV === 'production' ? 'true' : 'false');
  return !['false', '0', 'no', 'off'].includes(raw.trim().toLowerCase());
}

export function createAppQueue(
  name: string,
  configService: ConfigService,
  options: Omit<QueueOptions, 'connection'> = {},
): AppQueue {
  if (!areQueuesEnabled(configService)) {
    return new DisabledQueue();
  }

  return new Queue(name, {
    ...options,
    connection: {
      host: configService.get<string>('REDIS_HOST') ?? process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(configService.get<string>('REDIS_PORT') ?? process.env.REDIS_PORT ?? 6379),
    },
  });
}
