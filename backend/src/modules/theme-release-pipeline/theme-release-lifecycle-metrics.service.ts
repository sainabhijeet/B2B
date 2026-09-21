import { Injectable } from '@nestjs/common';

@Injectable()
export class ThemeReleaseLifecycleMetricsService {
  private readonly counters = new Map<string, number>();

  increment(action: string): void {
    this.counters.set(action, (this.counters.get(action) ?? 0) + 1);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
