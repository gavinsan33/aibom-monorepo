import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';

/**
 * Same tenancy-scoped proxy `QueryBrowser` uses when given a `namespace`
 * prop (see CLAUDE.md's RBAC note) -- always sends `namespace`, never the
 * cluster-wide `/api/prometheus` endpoint.
 */
const TENANCY_RANGE_URL = '/api/prometheus-tenancy/api/v1/query_range';

const TARGET_POINTS = 240;
const MIN_STEP_SECONDS = 15;

export interface RangePoint {
  /** Seconds since the window start. */
  x: number;
  y: number;
}

export interface RangeSeries {
  labels: Record<string, string>;
  points: RangePoint[];
}

export const rangeStepSeconds = (startMs: number, endMs: number): number =>
  Math.max(MIN_STEP_SECONDS, Math.ceil((endMs - startMs) / 1000 / TARGET_POINTS));

export function buildRangeUrl(
  query: string,
  namespace: string,
  startMs: number,
  endMs: number,
): string {
  const params = new URLSearchParams({
    query,
    namespace,
    start: String(startMs / 1000),
    end: String(endMs / 1000),
    step: String(rangeStepSeconds(startMs, endMs)),
  });
  return `${TENANCY_RANGE_URL}?${params.toString()}`;
}

interface MatrixResponse {
  data?: {
    result?: { metric?: Record<string, string>; values?: [number, string][] }[];
  };
}

/** Prometheus matrix -> series with x relative to `startMs`; drops NaN/Inf samples. */
export function parseRangeResponse(json: unknown, startMs: number): RangeSeries[] {
  const result = (json as MatrixResponse | undefined)?.data?.result ?? [];
  return result.map((entry) => ({
    labels: entry.metric ?? {},
    points: (entry.values ?? [])
      .map(([ts, value]) => ({ x: ts - startMs / 1000, y: Number(value) }))
      .filter((point) => Number.isFinite(point.y)),
  }));
}

export async function fetchRange(
  query: string,
  namespace: string,
  startMs: number,
  endMs: number,
): Promise<RangeSeries[]> {
  const json: unknown = await consoleFetchJSON(buildRangeUrl(query, namespace, startMs, endMs));
  return parseRangeResponse(json, startMs);
}
