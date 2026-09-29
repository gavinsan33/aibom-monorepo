import type {
  StoredMetric,
  StoredPoint,
  StoredTelemetry,
  TelemetrySeriesRef,
} from '../types/telemetrySeries';

/** Highest `schema_version` this code understands; newer payloads are treated as absent rather than misread. */
export const SUPPORTED_SCHEMA_VERSION = 1;

const isPoint = (p: unknown): p is StoredPoint =>
  Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

const validPoints = (raw: unknown): StoredPoint[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter(isPoint) : [];

/** Parses `series.json`, dropping malformed points/metrics. Returns undefined if it isn't a supported payload. */
export function parseStoredTelemetry(text: string): StoredTelemetry | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const doc = json as Partial<StoredTelemetry> | null;
  if (!doc || typeof doc !== 'object' || !doc.window || !doc.metrics) return undefined;
  const { window } = doc;
  if (!(doc.schema_version && doc.schema_version <= SUPPORTED_SCHEMA_VERSION)) return undefined;

  const metrics: Record<string, StoredMetric> = {};
  for (const [key, raw] of Object.entries(doc.metrics)) {
    const aggregate = validPoints(raw.aggregate);
    if (aggregate.length === 0) continue;
    metrics[key] = {
      unit: raw.unit,
      aggregation: raw.aggregation,
      aggregate,
      aggregate_max: raw.aggregate_max ? validPoints(raw.aggregate_max) : undefined,
      series: raw.series?.map((s) => ({ labels: s.labels, points: validPoints(s.points) })),
      series_omitted: raw.series_omitted,
    };
  }
  return {
    schema_version: doc.schema_version,
    window,
    pods: doc.pods ?? [],
    metrics,
  };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Where a reference's payload lives and how to pull the string out of the fetched object. */
export interface SeriesSource {
  groupVersionKind: { group: string; version: string; kind: string };
  name: string;
  text: (resource: unknown) => string | undefined;
}

/**
 * Resolves the reference to its `AIBOMTelemetry` object. Anything else (no
 * `name`, another kind -- `spec.data` is unvalidated) yields undefined, so the
 * caller falls back to live queries.
 */
export function seriesSource(ref: TelemetrySeriesRef): SeriesSource | undefined {
  if (ref.kind !== 'AIBOMTelemetry' || !ref.name) return undefined;
  return {
    groupVersionKind: { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOMTelemetry' },
    name: ref.name,
    text: (resource) => (resource as { spec?: { seriesJson?: string } }).spec?.seriesJson,
  };
}

/**
 * Parses the series payload string, checking its digest against the AIBOM's
 * reference (which sits inside the signed `spec.data`, though this plugin
 * doesn't verify that signature). A mismatch -- truncated or edited object --
 * is treated as "no stored series" so the caller falls back. If WebCrypto is
 * unavailable (non-secure context) the digest check is skipped.
 */
export async function loadStoredTelemetry(
  ref: TelemetrySeriesRef,
  text: string | undefined,
): Promise<StoredTelemetry | undefined> {
  if (!text) return undefined;
  if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
    if ((await sha256Hex(text)) !== ref.sha256) return undefined;
  }
  return parseStoredTelemetry(text);
}
