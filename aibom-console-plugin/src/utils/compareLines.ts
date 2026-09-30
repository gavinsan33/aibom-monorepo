import type { StoredMetric, StoredSeries } from '../types/telemetrySeries';
import type { RangePoint, RangeSeries } from './prometheusRange';

/** One drawn line: a run's aggregate, or (expanded) one of its pods/GPUs. */
export interface ChartLine {
  /** Legend/tooltip name. */
  name: string;
  /** Index into the compared list, so color matches the tables' `Label`s. */
  colorIndex: number;
  points: RangePoint[];
  /** SVG dash pattern; only set on expanded per-series lines. */
  dash?: string;
}

/** Live aggregation rule, matching what the webhook applies when it stores `aggregate`: unweighted average for utilization/latency/cache ratios, sum for everything else. */
const AVG_METRICS = new Set([
  'gpu_utilization',
  'kv_cache_usage',
  'time_to_first_token_seconds',
  'inter_token_latency_seconds',
]);

export const liveAggregation = (metricKey: string): 'sum' | 'avg' =>
  AVG_METRICS.has(metricKey) ? 'avg' : 'sum';

const DASHES = [undefined, '6 3', '2 3', '8 3 2 3'];

export const seriesTitle = (labels: Partial<Record<string, string>>): string =>
  (['pod', 'container', 'interface', 'gpu'] as const)
    .map((k) => labels[k])
    .filter(Boolean)
    .join(' / ') || 'series';

/** Combines series sample-by-sample (matching x), by sum or average. */
export function aggregatePoints(series: RangeSeries[], mode: 'sum' | 'avg'): RangePoint[] {
  const byX = new Map<number, { total: number; count: number }>();
  for (const s of series) {
    for (const p of s.points) {
      const acc = byX.get(p.x) ?? { total: 0, count: 0 };
      acc.total += p.y;
      acc.count++;
      byX.set(p.x, acc);
    }
  }
  return Array.from(byX.entries())
    .sort(([a], [b]) => a - b)
    .map(([x, { total, count }]) => ({ x, y: mode === 'avg' ? total / count : total }));
}

function expandedLines(
  series: { title: string; points: RangePoint[] }[],
  name: string,
  colorIndex: number,
): ChartLine[] {
  return series.map((s, i) => ({
    name: `${name} · ${s.title}`,
    colorIndex,
    points: s.points,
    dash: DASHES[i % DASHES.length],
  }));
}

/** Stored path: x is seconds since the run's stored window start. */
export function linesFromStored(
  metric: StoredMetric,
  windowStart: number,
  expanded: boolean,
  name: string,
  colorIndex: number,
): ChartLine[] {
  const rel = (points: [number, number][]): RangePoint[] =>
    points.map(([ts, y]) => ({ x: ts - windowStart, y }));
  const perSeries: StoredSeries[] | undefined =
    expanded && !metric.series_omitted && metric.series && metric.series.length > 1
      ? metric.series
      : undefined;
  if (perSeries) {
    return expandedLines(
      perSeries.map((s) => ({ title: seriesTitle(s.labels), points: rel(s.points) })),
      name,
      colorIndex,
    );
  }
  return [{ name, colorIndex, points: rel(metric.aggregate) }];
}

/** Live path: `series` are already relative to the window start. */
export function linesFromLive(
  series: RangeSeries[],
  metricKey: string,
  expanded: boolean,
  name: string,
  colorIndex: number,
): ChartLine[] {
  if (expanded && series.length > 1) {
    return expandedLines(
      series.map((s) => ({ title: seriesTitle(s.labels), points: s.points })),
      name,
      colorIndex,
    );
  }
  return [{ name, colorIndex, points: aggregatePoints(series, liveAggregation(metricKey)) }];
}
