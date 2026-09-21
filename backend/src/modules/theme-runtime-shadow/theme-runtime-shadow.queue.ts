import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThemePlatformMetricsService } from '../../common/observability/theme-platform-metrics.service';

type Work<T> = {
  task: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T | null) => void;
};

@Injectable()
export class ThemeRuntimeShadowQueue implements OnModuleDestroy {
  private readonly pending: Array<Work<unknown>> = [];
  private readonly active = new Set<AbortController>();
  private running = 0;
  private consecutiveFailures = 0;
  private circuitOpenedAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: ThemePlatformMetricsService,
  ) {}

  execute<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    const sampleRate = this.config.get<number>(
      'themeRuntimeShadow.sampleRate',
      1,
    );
    if (Math.random() > Math.max(0, Math.min(1, sampleRate))) {
      this.metrics.increment('runtime_shadow_sampled_out');
      return Promise.resolve(null);
    }
    if (this.isCircuitOpen()) {
      this.metrics.increment('runtime_shadow_circuit_open');
      return Promise.resolve(null);
    }
    const capacity = this.config.get<number>(
      'themeRuntimeShadow.queueCapacity',
      1000,
    );
    if (this.pending.length >= capacity) {
      this.metrics.increment('runtime_shadow_queue_rejected');
      return Promise.resolve(null);
    }
    return new Promise<T | null>((resolve) => {
      this.pending.push({
        task: task as (signal: AbortSignal) => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
      });
      this.metrics.increment('runtime_shadow_queue_accepted');
      this.drain();
    });
  }

  onModuleDestroy(): void {
    for (const controller of this.active) controller.abort();
    while (this.pending.length) this.pending.shift()?.resolve(null);
  }

  private drain(): void {
    const maxConcurrency = this.config.get<number>(
      'themeRuntimeShadow.maxConcurrency',
      4,
    );
    while (this.running < maxConcurrency && this.pending.length > 0) {
      const work = this.pending.shift();
      if (!work) return;
      this.running += 1;
      void this.run(work);
    }
  }

  private async run(work: Work<unknown>): Promise<void> {
    const controller = new AbortController();
    this.active.add(controller);
    const timeoutMs = this.config.get<number>(
      'themeRuntimeShadow.timeoutMs',
      1500,
    );
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          this.metrics.increment('runtime_shadow_timeout');
          reject(new Error('Runtime shadow comparison timed out.'));
        }, timeoutMs);
      });
      const value = await Promise.race([work.task(controller.signal), timeout]);
      this.consecutiveFailures = 0;
      work.resolve(value);
      this.metrics.observe('runtime_shadow_duration_ms', Date.now() - started);
    } catch {
      this.consecutiveFailures += 1;
      this.metrics.increment('runtime_shadow_errors');
      if (
        this.consecutiveFailures >=
        this.config.get<number>('themeRuntimeShadow.circuitFailureThreshold', 5)
      ) {
        this.circuitOpenedAt = Date.now();
        this.metrics.increment('runtime_shadow_circuit_trips');
      }
      work.resolve(null);
    } finally {
      if (timer) clearTimeout(timer);
      this.active.delete(controller);
      this.running -= 1;
      this.drain();
    }
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenedAt) return false;
    const resetMs = this.config.get<number>(
      'themeRuntimeShadow.circuitResetMs',
      30000,
    );
    if (Date.now() - this.circuitOpenedAt < resetMs) return true;
    this.circuitOpenedAt = 0;
    this.consecutiveFailures = 0;
    return false;
  }
}
