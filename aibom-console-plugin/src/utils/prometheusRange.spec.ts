import { buildRangeUrl, parseRangeResponse, rangeStepSeconds } from './prometheusRange';

describe('prometheusRange', () => {
  it('builds a tenancy-proxy URL carrying the namespace', () => {
    const url = new URL(buildRangeUrl('up{pod="a"}', 'ns', 1_000_000, 1_600_000), 'http://x');
    expect(url.pathname).toBe('/api/prometheus-tenancy/api/v1/query_range');
    expect(url.searchParams.get('namespace')).toBe('ns');
    expect(url.searchParams.get('query')).toBe('up{pod="a"}');
    expect(url.searchParams.get('start')).toBe('1000');
    expect(url.searchParams.get('end')).toBe('1600');
  });

  it('never uses a step under 15s', () => {
    expect(rangeStepSeconds(0, 60_000)).toBe(15);
    expect(rangeStepSeconds(0, 240 * 60 * 1000)).toBe(60);
  });

  it('parses a matrix into window-relative points and drops non-finite samples', () => {
    const series = parseRangeResponse(
      {
        data: {
          result: [
            {
              metric: { pod: 'a' },
              values: [
                [1000, '1'],
                [1015, 'NaN'],
                [1030, '3'],
              ],
            },
          ],
        },
      },
      1_000_000,
    );
    expect(series).toEqual([
      {
        labels: { pod: 'a' },
        points: [
          { x: 0, y: 1 },
          { x: 30, y: 3 },
        ],
      },
    ]);
  });

  it('tolerates a missing/empty response', () => {
    expect(parseRangeResponse(undefined, 0)).toEqual([]);
  });
});
