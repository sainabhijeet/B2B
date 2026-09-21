import { Injectable } from '@nestjs/common';

@Injectable()
export class ThemeRuntimeShadowMetricsService {
  private readonly counters = new Map<string, number>();
  increment(key: string): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }
  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
