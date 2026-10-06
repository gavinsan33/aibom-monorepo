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

/**
 * Upper bound of the shared x-axis (elapsed seconds) for a set of runs: the
 * longest collection window among them. Without it each chart zooms its x-axis
 * to its own data, so a metric that only started reporting late (vLLM's
 * metrics before the server is up, TTFT before any request completes) is
 * stretched across the full width and looks like it shares a time axis with
 * charts that started at 0. Undefined when no run knows its window end.
 */
export function sharedElapsedMax(
  runs: { windowStart: number; windowEnd?: number }[],
): number | undefined {
  const spans = runs.flatMap((run) =>
    run.windowEnd !== undefined && run.windowEnd > run.windowStart
      ? [run.windowEnd - run.windowStart]
      : [],
  );
  return spans.length > 0 ? Math.max(...spans) : undefined;
}
