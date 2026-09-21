import { Injectable } from '@nestjs/common';

@Injectable()
export class ThemeDeploymentMetricsService {
  private readonly counters = new Map<string, number>();

  increment(metric: string): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + 1);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
