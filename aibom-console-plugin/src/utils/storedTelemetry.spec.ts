import { webcrypto, createHash } from 'crypto';
import type { TelemetrySeriesRef } from '../types/telemetrySeries';
import { loadStoredTelemetry, parseStoredTelemetry, seriesSource } from './storedTelemetry';

const payload = {
  schema_version: 1,
  window: { start: 100, end: 200, step_seconds: 30 },
  pods: ['a'],
  metrics: {
    memory_usage: {
      unit: 'bytes',
      aggregation: 'sum',
      aggregate: [
        [100, 1],
        [130, 'bad'],
        [160, 2],
      ],
    },
    empty_metric: { aggregate: [] },
  },
};
const text = JSON.stringify(payload);

const refFor = (body: string): TelemetrySeriesRef => ({
  schema_version: 1,
  kind: 'AIBOMTelemetry',
  name: 'job-telemetry-ab12',
  sha256: createHash('sha256').update(body).digest('hex'),
  size_bytes: body.length,
  window: payload.window,
});

describe('parseStoredTelemetry', () => {
  it('drops malformed points and metrics with no usable aggregate', () => {
    const parsed = parseStoredTelemetry(text);
    expect(Object.keys(parsed?.metrics ?? {})).toEqual(['memory_usage']);
    expect(parsed?.metrics.memory_usage.aggregate).toEqual([
      [100, 1],
      [160, 2],
    ]);
  });

  it('rejects garbage and unsupported schema versions', () => {
    expect(parseStoredTelemetry('not json')).toBeUndefined();
    expect(parseStoredTelemetry('{}')).toBeUndefined();
    expect(parseStoredTelemetry(JSON.stringify({ ...payload, schema_version: 2 }))).toBeUndefined();
  });

  it('never throws on structurally wrong payloads', () => {
    const wrong = [
      { ...payload, metrics: { cpu_usage: null } },
      { ...payload, metrics: { cpu_usage: 'x' } },
      { ...payload, metrics: [] },
      { ...payload, window: 'soon' },
      { ...payload, window: { start: 'a', end: 1, step_seconds: 1 } },
      { ...payload, pods: 7 },
      [],
      null,
      42,
    ];
    for (const doc of wrong) {
      expect(() => parseStoredTelemetry(JSON.stringify(doc))).not.toThrow();
    }
    expect(parseStoredTelemetry(JSON.stringify({ ...payload, window: 'soon' }))).toBeUndefined();
  });

  it('skips null series entries, coerces bad labels, and drops unrepresentable timestamps', () => {
    const parsed = parseStoredTelemetry(
      JSON.stringify({
        ...payload,
        metrics: {
          cpu_usage: {
            unit: 5,
            aggregation: 'median',
            aggregate: [
              [100, 1],
              [1e20, 2], // past what Date can represent
            ],
            series: [
              null,
              { labels: { pod: 'a', n: 3 }, points: [[100, 1]] },
              { points: [[100, 1]] },
            ],
          },
        },
      }),
    );
    const metric = parsed?.metrics.cpu_usage;
    expect(metric?.aggregate).toEqual([[100, 1]]);
    expect(metric?.unit).toBeUndefined();
    expect(metric?.aggregation).toBeUndefined();
    expect(metric?.series).toEqual([
      { labels: { pod: 'a' }, points: [[100, 1]] },
      { labels: {}, points: [[100, 1]] },
    ]);
  });
});

describe('loadStoredTelemetry', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  it('accepts a payload whose digest matches the reference', async () => {
    const loaded = await loadStoredTelemetry(refFor(text), text);
    expect(loaded?.metrics.memory_usage).toBeDefined();
  });

  it('treats a digest mismatch or missing payload as absent', async () => {
    expect(await loadStoredTelemetry(refFor(text), text.replace('100', '101'))).toBeUndefined();
    expect(await loadStoredTelemetry(refFor(text), '')).toBeUndefined();
    expect(await loadStoredTelemetry(refFor(text), undefined)).toBeUndefined();
  });
});

describe('seriesSource', () => {
  const base = { schema_version: 1, sha256: 'x', size_bytes: 1, window: payload.window };

  it('reads an AIBOMTelemetry reference from spec.seriesJson', () => {
    const source = seriesSource({ ...base, kind: 'AIBOMTelemetry', name: 'job-telemetry-ab12' });
    expect(source?.groupVersionKind).toEqual({
      group: 'aibom.io',
      version: 'v1alpha1',
      kind: 'AIBOMTelemetry',
    });
    expect(source?.name).toBe('job-telemetry-ab12');
    expect(source?.text({ spec: { seriesJson: text } })).toBe(text);
  });

  it('ignores a reference that is not a named AIBOMTelemetry (spec.data is unvalidated)', () => {
    const legacy = {
      ...base,
      configmap: 'cm',
      key: 'series.json',
    } as unknown as TelemetrySeriesRef;
    expect(seriesSource(legacy)).toBeUndefined();
    expect(seriesSource({ ...base, kind: 'AIBOMTelemetry', name: '' })).toBeUndefined();
  });
});
