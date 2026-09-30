import type { AIBOMResource } from '../types/aibom';
import { buildSummaryCsv } from './exportSummary';

const item = (name: string, model: string, gpuCount: number, note?: string): AIBOMResource => ({
  metadata: { name, namespace: 'ns' },
  spec: {
    jobName: `job-${name}`,
    collectedAt: '2026-01-01T00:00:00Z',
    data: {
      model: { name: model },
      environment: { gpu_count: gpuCount },
      resource_utilization: {
        note,
        metrics: { cpu_usage: { avg: 2.5, unit: 'cores' } },
      },
    },
  },
});

describe('buildSummaryCsv', () => {
  const lines = buildSummaryCsv([item('a', 'granite', 1), item('b', '=evil()', 8, 'no telemetry')])
    .trim()
    .split('\r\n');
  const header = lines[0].split(',');

  it('writes one row per AIBOM under a shared header', () => {
    expect(lines).toHaveLength(3);
    expect(header.slice(0, 4)).toEqual(['aibom', 'namespace', 'name', 'collected_at']);
    expect(header).toContain('Model Name');
    expect(header).toContain('CPU Usage (avg)');
    expect(lines[1].startsWith('ns/a,ns,a,2026-01-01T00:00:00Z')).toBe(true);
  });

  it('neutralizes formula-looking values from spec.data', () => {
    expect(lines[2]).toContain("'=evil()");
  });

  it('blanks metric cells for a run whose telemetry was unavailable', () => {
    const col = header.indexOf('CPU Usage (avg)');
    expect(lines[1].split(',')[col]).toBe('2.5');
    expect(lines[2].split(',')[col]).toBe('');
  });
});
