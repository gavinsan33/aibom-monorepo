import type { AIBOMResource } from '../types/aibom';
import { HARDWARE_METRIC_ORDER, INFERENCE_METRIC_ORDER } from '../types/aibom';
import type { StoredMetric, StoredPoint, StoredTelemetry } from '../types/telemetrySeries';
import {
  getExperimentIntent,
  getGpuCount,
  getGpuType,
  getJobName,
  getModelName,
} from './aibomFields';
import { seriesTitle } from './compareLines';
import { csvLine } from './csv';
import { aibomKey } from './exportSummary';

/** Above this many data rows the UI asks before downloading (Excel and browsers get slow). */
export const LARGE_EXPORT_ROWS = 500_000;

const HEADER = [
  'aibom',
  'job',
  'model',
  'gpu_type',
  'gpu_count',
  'experiment_intent',
  'metric',
  'unit',
  'series',
  'timestamp_utc',
  'unix_seconds',
  'value',
];

/** Known metrics in their display order, then anything else the webhook added, alphabetically. */
function orderedMetricKeys(stored: StoredTelemetry): string[] {
  const known: readonly string[] = [...HARDWARE_METRIC_ORDER, ...INFERENCE_METRIC_ORDER];
  const present = Object.keys(stored.metrics);
  return [
    ...known.filter((key) => present.includes(key)),
    ...present.filter((key) => !known.includes(key)).sort(),
  ];
}

/**
 * The lines of a metric to export: the per-run `aggregate`, its per-bucket
 * peak (`aggregate_max`) when present, and each per-pod/GPU series. A single
 * series is skipped since it would just repeat the aggregate.
 */
function metricLines(metric: StoredMetric): { series: string; points: StoredPoint[] }[] {
  const lines = [{ series: 'aggregate', points: metric.aggregate }];
  if (metric.aggregate_max?.length) {
    lines.push({ series: 'aggregate_max', points: metric.aggregate_max });
  }
  if (!metric.series_omitted && metric.series && metric.series.length > 1) {
    for (const s of metric.series) {
      lines.push({ series: seriesTitle(s.labels), points: s.points });
    }
  }
  return lines;
}

/** Data rows (excluding the header) this AIBOM's series would add. */
export function countTelemetryRows(stored: StoredTelemetry): number {
  return Object.values(stored.metrics).reduce(
    (total, metric) => total + metricLines(metric).reduce((n, line) => n + line.points.length, 0),
    0,
  );
}

/** Hard ceiling: past this many rows the export is refused rather than risking a browser tab. */
export const MAX_EXPORT_ROWS = 5_000_000;

/** Rough JSON size of one `[unix_seconds,value],` point, for estimating rows from a reference's `size_bytes` before fetching anything. */
const APPROX_BYTES_PER_POINT = 17;

export const estimateTelemetryRows = (sizeBytes: number): number =>
  Math.ceil(sizeBytes / APPROX_BYTES_PER_POINT);

/** ISO-8601 UTC, or empty for a timestamp `Date` can't represent (never throws). */
const isoUtc = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const telemetryCsvHeader = (): string => csvLine(HEADER) + '\r\n';

/**
 * One AIBOM's data rows (CRLF-terminated, no header): one row per sample. A
 * few identifying columns repeat on each row so runs can be compared in a
 * single pivot table without joining the summary file (which shares the
 * `aibom` key). Values are the raw base units the webhook stores; nothing is
 * rescaled, with `unit` as its own column. Returned per AIBOM so callers can
 * discard each payload as soon as its rows are built.
 */
export function telemetryCsvRows(item: AIBOMResource, stored: StoredTelemetry): string {
  const identity = [
    aibomKey(item),
    getJobName(item),
    getModelName(item),
    getGpuType(item),
    getGpuCount(item),
    getExperimentIntent(item),
  ];
  const lines: string[] = [];
  for (const metricKey of orderedMetricKeys(stored)) {
    const metric = stored.metrics[metricKey];
    for (const line of metricLines(metric)) {
      for (const [ts, value] of line.points) {
        lines.push(
          csvLine([...identity, metricKey, metric.unit, line.series, isoUtc(ts), ts, value]),
        );
      }
    }
  }
  return lines.length > 0 ? lines.join('\r\n') + '\r\n' : '';
}

export function buildTelemetryCsv(
  entries: { item: AIBOMResource; stored: StoredTelemetry }[],
): string {
  return (
    telemetryCsvHeader() +
    entries.map(({ item, stored }) => telemetryCsvRows(item, stored)).join('')
  );
}
