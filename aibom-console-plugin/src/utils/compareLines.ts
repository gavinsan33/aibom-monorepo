import type { StoredMetric, StoredPoint } from '../types/telemetrySeries';

/** A sample: `x` is seconds since the run's window start. */
export interface ChartPoint {
  x: number;
  y: number;
}

/** One drawn line: a run's aggregate, or (expanded) one of its pods/GPUs. */
export interface ChartLine {
  /** Legend/tooltip name. */
  name: string;
  /** Index into the compared list, so color matches the tables' `Label`s. */
  colorIndex: number;
  points: ChartPoint[];
  /** SVG dash pattern; only set on expanded per-series lines. */
  dash?: string;
}

const DASHES = [undefined, '6 3', '2 3', '8 3 2 3'];

export const seriesTitle = (labels: Partial<Record<string, string>>): string =>
  (['pod', 'container', 'interface', 'gpu'] as const)
    .map((k) => labels[k])
    .filter(Boolean)
    .join(' / ') || 'series';

/**
 * Lines for one run's stored metric: its `aggregate`, or -- when `expanded`
 * and the webhook kept them -- one line per pod/container/interface/GPU, in the
 * run's color with dashed variants. Stays aggregated if the series were
 * omitted or there is only one.
 */
export function linesFromStored(
  metric: StoredMetric,
  windowStart: number,
  expanded: boolean,
  name: string,
  colorIndex: number,
): ChartLine[] {
  const rel = (points: StoredPoint[]): ChartPoint[] =>
    points.map(([ts, y]) => ({ x: ts - windowStart, y }));
  const series = metric.series;
  if (expanded && !metric.series_omitted && series && series.length > 1) {
    return series.map((s, i) => ({
      name: `${name} · ${seriesTitle(s.labels)}`,
      colorIndex,
      points: rel(s.points),
      dash: DASHES[i % DASHES.length],
    }));
  }
  return [{ name, colorIndex, points: rel(metric.aggregate) }];
}
