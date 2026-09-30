import type { StoredMetric } from '../types/telemetrySeries';
import { linesFromStored } from './compareLines';

const metric: StoredMetric = {
  unit: 'bytes',
  aggregation: 'sum',
  aggregate: [
    [100, 3],
    [130, 5],
  ],
  series: [
    { labels: { pod: 'a' }, points: [[100, 1]] },
    { labels: { pod: 'b' }, points: [[100, 2]] },
  ],
};

describe('linesFromStored', () => {
  it('draws one aggregate line relative to the window start by default', () => {
    expect(linesFromStored(metric, 100, false, 'run', 2)).toEqual([
      {
        name: 'run',
        colorIndex: 2,
        points: [
          { x: 0, y: 3 },
          { x: 30, y: 5 },
        ],
      },
    ]);
  });

  it('expands to one dashed-variant line per series in the same color', () => {
    const lines = linesFromStored(metric, 100, true, 'run', 2);
    expect(lines.map((l) => l.name)).toEqual(['run · a', 'run · b']);
    expect(new Set(lines.map((l) => l.colorIndex))).toEqual(new Set([2]));
    expect(lines[0].dash).toBeUndefined();
    expect(lines[1].dash).toBe('6 3');
  });

  it('stays aggregated when the series were omitted or there is only one', () => {
    expect(linesFromStored({ ...metric, series_omitted: true }, 100, true, 'run', 0)).toHaveLength(
      1,
    );
    expect(
      linesFromStored({ ...metric, series: metric.series?.slice(0, 1) }, 100, true, 'r', 0),
    ).toHaveLength(1);
  });
});
