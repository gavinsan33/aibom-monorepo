import type { AIBOMResource } from '../types/aibom';
import { sortByAge, sortByMetric } from './sort';

function withMetric(name: string, avg: number): AIBOMResource {
  return {
    metadata: { name },
    spec: { data: { resource_utilization: { metrics: { gpu_utilization: { avg } } } } },
  };
}

function withCollectedAt(name: string, collectedAt: string): AIBOMResource {
  return { metadata: { name }, spec: { collectedAt } };
}

const names = (items: AIBOMResource[]): (string | undefined)[] =>
  items.map((i) => i.metadata?.name);

describe('sortByMetric', () => {
  const items = () => [withMetric('low', 20), withMetric('high', 90), withMetric('mid', 55)];

  it('sorts descending (highest first) by default', () => {
    expect(names(sortByMetric(items(), 'gpu-utilization', false))).toEqual(['high', 'mid', 'low']);
  });

  it('sorts ascending when requested', () => {
    expect(names(sortByMetric(items(), 'gpu-utilization', true))).toEqual(['low', 'mid', 'high']);
  });

  it('treats a never-collected metric as 0, not excluded', () => {
    const uncollected: AIBOMResource = { metadata: { name: 'none' }, spec: { data: {} } };
    const result = sortByMetric([...items(), uncollected], 'gpu-utilization', true);
    expect(names(result)[0]).toBe('none');
    expect(result).toHaveLength(4);
  });
});

describe('sortByAge', () => {
  const items = () => [
    withCollectedAt('middle', '2026-06-15T00:00:00Z'),
    withCollectedAt('newest', '2026-09-01T00:00:00Z'),
    withCollectedAt('oldest', '2026-01-01T00:00:00Z'),
  ];

  it('defaults to oldest-first', () => {
    expect(names(sortByAge(items(), false))).toEqual(['oldest', 'middle', 'newest']);
  });

  it('reverses to most-recent-first when ascending', () => {
    expect(names(sortByAge(items(), true))).toEqual(['newest', 'middle', 'oldest']);
  });

  it('sorts an unparseable/missing collectedAt last, regardless of direction', () => {
    const mixed = [
      withCollectedAt('bad', 'not-a-timestamp'),
      withCollectedAt('good', '2026-01-01T00:00:00Z'),
    ];
    expect(names(sortByAge(mixed, false))).toEqual(['good', 'bad']);
    expect(names(sortByAge(mixed, true))).toEqual(['good', 'bad']);
  });
});
