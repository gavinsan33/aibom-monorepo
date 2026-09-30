import type {
  StoredMetric,
  StoredPoint,
  StoredTelemetry,
  TelemetrySeriesRef,
} from '../types/telemetrySeries';

/** Highest `schema_version` this code understands; newer payloads are treated as absent rather than misread. */
export const SUPPORTED_SCHEMA_VERSION = 1;

/** Largest magnitude `Date` accepts, in ms; a sample outside it can't be formatted as a timestamp. */
const MAX_DATE_MS = 8.64e15;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isPoint = (p: unknown): p is StoredPoint =>
  Array.isArray(p) &&
  p.length === 2 &&
  isFiniteNumber(p[0]) &&
  Math.abs(p[0] * 1000) <= MAX_DATE_MS &&
  isFiniteNumber(p[1]);

const validPoints = (raw: unknown): StoredPoint[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter(isPoint) : [];

const stringLabels = (raw: unknown): Record<string, string> =>
  isRecord(raw)
    ? Object.fromEntries(
        Object.entries(raw).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : {};

function parseMetric(raw: unknown): StoredMetric | undefined {
  if (!isRecord(raw)) return undefined;
  const aggregate = validPoints(raw.aggregate);
  if (aggregate.length === 0) return undefined;
  return {
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    aggregation:
      raw.aggregation === 'sum' || raw.aggregation === 'avg' ? raw.aggregation : undefined,
    aggregate,
    aggregate_max: Array.isArray(raw.aggregate_max) ? validPoints(raw.aggregate_max) : undefined,
    series: Array.isArray(raw.series)
      ? (raw.series as unknown[]).filter(isRecord).map((s) => ({
          labels: stringLabels(s.labels),
          points: validPoints(s.points),
        }))
      : undefined,
    series_omitted: raw.series_omitted === true,
  };
}

/**
 * Parses `series.json`, dropping malformed points, series and metrics. The
 * payload is a Kubernetes object field, so nothing about its shape is
 * trusted; returns undefined (never throws) if it isn't a supported payload.
 */
export function parseStoredTelemetry(text: string): StoredTelemetry | undefined {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(doc) || !isRecord(doc.window) || !isRecord(doc.metrics)) return undefined;
  const { schema_version: version, window } = doc;
  if (!isFiniteNumber(version) || version < 1 || version > SUPPORTED_SCHEMA_VERSION) {
    return undefined;
  }
  if (
    !isFiniteNumber(window.start) ||
    !isFiniteNumber(window.end) ||
    !isFiniteNumber(window.step_seconds)
  ) {
    return undefined;
  }

  const metrics: Record<string, StoredMetric> = {};
  for (const [key, raw] of Object.entries(doc.metrics)) {
    const metric = parseMetric(raw);
    if (metric) metrics[key] = metric;
  }
  return {
    schema_version: version,
    window: { start: window.start, end: window.end, step_seconds: window.step_seconds },
    pods: Array.isArray(doc.pods)
      ? (doc.pods as unknown[]).filter((p): p is string => typeof p === 'string')
      : [],
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
    text: (resource) => {
      if (!isRecord(resource) || !isRecord(resource.spec)) return undefined;
      const { seriesJson } = resource.spec;
      return typeof seriesJson === 'string' ? seriesJson : undefined;
    },
  };
}

/**
 * Parses the series payload string, checking its digest against the AIBOM's
 * reference. That is an integrity check (truncated or edited object), not
 * authenticity: the reference sits in unvalidated `spec.data` and this plugin
 * doesn't verify the AIBOM signature, so anyone who can create an AIBOM in the
 * namespace can point it at another run's series and pass. A mismatch or an
 * unparseable payload is treated as "no stored series" so the caller falls
 * back; this never throws. If WebCrypto is unavailable (non-secure context)
 * the digest check is skipped.
 */
export async function loadStoredTelemetry(
  ref: TelemetrySeriesRef,
  text: string | undefined,
): Promise<StoredTelemetry | undefined> {
  if (!text) return undefined;
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
      if ((await sha256Hex(text)) !== ref.sha256) return undefined;
    }
    return parseStoredTelemetry(text);
  } catch {
    return undefined;
  }
}
