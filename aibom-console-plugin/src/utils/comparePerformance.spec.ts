import type { AIBOMResource } from '../types/aibom';
import { buildPerformanceRows } from './comparePerformance';

function withMetric(avg: number, note?: string): AIBOMResource {
  return {
    spec: {
      data: {
        resource_utilization: {
          note,
          metrics: { gpu_utilization: { avg, unit: '%' } },
        },
      },
    },
  };
}

describe('buildPerformanceRows', () => {
  it('computes delta and pct-change for exactly two items', () => {
    const rows = buildPerformanceRows([withMetric(50), withMetric(75)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBe(25);
    expect(gpu?.pctChange).toBeCloseTo(50);
  });

  it('treats a zero starting value as an undefined pct-change, not NaN/Infinity', () => {
    const rows = buildPerformanceRows([withMetric(0), withMetric(10)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBe(10);
    expect(gpu?.pctChange).toBeUndefined();
  });

  it('omits delta/pct-change when more than two items are compared', () => {
    const rows = buildPerformanceRows([withMetric(10), withMetric(20), withMetric(30)]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.delta).toBeUndefined();
    expect(gpu?.pctChange).toBeUndefined();
    expect(gpu?.values).toHaveLength(3);
  });

  it('flags a cell unavailable when that item has a resource_utilization note', () => {
    const rows = buildPerformanceRows([withMetric(50), withMetric(0, 'telemetry unavailable')]);
    const gpu = rows.find((r) => r.metricKey === 'gpu_utilization');
    expect(gpu?.values[0].unavailable).toBe(false);
    expect(gpu?.values[1].unavailable).toBe(true);
  });
});
