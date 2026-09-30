import type { AIBOMResource } from '../types/aibom';
import type { StoredTelemetry } from '../types/telemetrySeries';
import { buildTelemetryCsv, countTelemetryRows } from './exportTelemetry';

const item: AIBOMResource = {
  metadata: { name: 'a', namespace: 'ns' },
  spec: {
    jobName: 'job-a',
    data: { model: { name: 'granite' }, environment: { gpu_type: 'A100', gpu_count: 2 } },
  },
};

const stored: StoredTelemetry = {
  schema_version: 1,
  window: { start: 0, end: 60, step_seconds: 30 },
  pods: ['p1', 'p2'],
  metrics: {
    // Deliberately out of display order to check ordering.
    memory_usage: {
      unit: 'bytes',
      aggregation: 'sum',
      aggregate: [[0, 3]],
      series: [
        { labels: { pod: 'p1' }, points: [[0, 1]] },
        { labels: { pod: 'p2' }, points: [[0, 2]] },
      ],
    },
    gpu_utilization: {
      unit: 'percent',
      aggregation: 'avg',
      aggregate: [
        [0, 10],
        [30, 20],
      ],
      aggregate_max: [
        [0, 15],
        [30, 25],
      ],
      series: [{ labels: { pod: 'p1', gpu: '0' }, points: [[0, 10]] }],
    },
  },
};

describe('buildTelemetryCsv', () => {
  const lines = buildTelemetryCsv([{ item, stored }]).trim().split('\r\n');

  it('writes a long-format row per sample with identifying columns', () => {
    expect(lines[0]).toBe(
      'aibom,job,model,gpu_type,gpu_count,experiment_intent,metric,unit,series,timestamp_utc,unix_seconds,value',
    );
    expect(lines[1]).toBe(
      'ns/a,job-a,granite,A100,2,,gpu_utilization,percent,aggregate,1970-01-01T00:00:00.000Z,0,10',
    );
  });

  it('lists metrics in display order, gpu before memory', () => {
    const metrics = lines.slice(1).map((l) => l.split(',')[6]);
    expect(metrics.indexOf('gpu_utilization')).toBeLessThan(metrics.indexOf('memory_usage'));
  });

  it('includes the peak line and per-pod series, but skips a lone series that repeats the aggregate', () => {
    const seriesNames = lines.slice(1).map((l) => l.split(',')[8]);
    expect(seriesNames).toContain('aggregate_max');
    expect(seriesNames).toContain('p1');
    expect(seriesNames).toContain('p2');
    expect(seriesNames).not.toContain('p1 / 0'); // gpu_utilization has only one series
  });

  it('counts exactly the rows it writes', () => {
    expect(countTelemetryRows(stored)).toBe(lines.length - 1);
  });
});
