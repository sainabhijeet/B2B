import { Injectable } from '@nestjs/common';

type Histogram = {
  count: number;
  sum: number;
  buckets: Record<string, number>;
};

@Injectable()
export class ThemePlatformMetricsService {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, Histogram>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  observe(
    name: string,
    value: number,
    boundaries = [5, 10, 25, 50, 100, 250, 500, 1000, 5000],
  ): void {
    const histogram = this.histograms.get(name) ?? {
      count: 0,
      sum: 0,
      buckets: {},
    };
    histogram.count += 1;
    histogram.sum += Math.max(0, value);
    for (const boundary of boundaries) {
      if (value <= boundary)
        histogram.buckets[String(boundary)] =
          (histogram.buckets[String(boundary)] ?? 0) + 1;
    }
    histogram.buckets.inf = (histogram.buckets.inf ?? 0) + 1;
    this.histograms.set(name, histogram);
  }

  snapshot(): {
    counters: Record<string, number>;
    histograms: Record<string, Histogram>;
  } {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      histograms: Object.fromEntries(
        [...this.histograms.entries()].map(([key, value]) => [
          key,
          { count: value.count, sum: value.sum, buckets: { ...value.buckets } },
        ]),
      ),
    };
  }

  prometheus(): string {
    const lines: string[] = [];
    for (const [name, value] of this.counters)
      lines.push(`${this.metricName(name)} ${value}`);
    for (const [name, histogram] of this.histograms) {
      for (const [bucket, value] of Object.entries(histogram.buckets))
        lines.push(`${this.metricName(name)}_bucket{le="${bucket}"} ${value}`);
      lines.push(`${this.metricName(name)}_sum ${histogram.sum}`);
      lines.push(`${this.metricName(name)}_count ${histogram.count}`);
    }
    return `${lines.join('\n')}\n`;
  }

  private metricName(name: string): string {
    return `theme_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }
}
