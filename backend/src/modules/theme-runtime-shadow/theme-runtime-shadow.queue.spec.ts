import { ThemeRuntimeShadowQueue } from './theme-runtime-shadow.queue';

describe('ThemeRuntimeShadowQueue', () => {
  const metrics = { increment: jest.fn(), observe: jest.fn() } as never;
  const config = (values: Record<string, number>) =>
    ({
      get: jest.fn(
        (key: string, fallback: number) =>
          values[key.replace('themeRuntimeShadow.', '')] ?? fallback,
      ),
    }) as never;

  it('limits active work and drains queued work', async () => {
    const queue = new ThemeRuntimeShadowQueue(
      config({ maxConcurrency: 1, queueCapacity: 2 }),
      metrics,
    );
    let release!: () => void;
    const first = queue.execute(
      () =>
        new Promise((resolve) => {
          release = () => resolve('first');
        }),
    );
    const second = queue.execute(async () => 'second');
    release();
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
    queue.onModuleDestroy();
  });

  it('rejects sampled work without invoking the task', async () => {
    const queue = new ThemeRuntimeShadowQueue(
      config({ sampleRate: 0 }),
      metrics,
    );
    const task = jest.fn(async () => 'never');
    await expect(queue.execute(task)).resolves.toBeNull();
    expect(task).not.toHaveBeenCalled();
  });
});
