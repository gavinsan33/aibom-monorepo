/**
 * Telemetry time series stored by `aibom-webhook-service` at collection time
 * (its `CLAUDE.md` "Telemetry Time Series" section is the source of truth),
 * so charts survive Prometheus's ~15 day retention. The AIBOM carries a small
 * reference in `spec.data.telemetry_series_ref` (inside the signed data); the
 * series live in a separate `AIBOMTelemetry` object in the AIBOM's namespace,
 * owned by the AIBOM. The reference is looked up by its own `name`, never by
 * a naming convention.
 */

export interface TelemetryWindowInfo {
  /** Integer unix seconds, UTC. */
  start: number;
  end: number;
  step_seconds: number;
}

export interface TelemetrySeriesRef {
  schema_version: number;
  /** `"AIBOMTelemetry"`: an `aibom.io/v1alpha1` object named `name`, whose `spec.seriesJson` is the payload. Typed `string` because `spec.data` is unvalidated. */
  kind: string;
  name: string;
  /** SHA-256 hex of the UTF-8 bytes of the payload string. */
  sha256: string;
  size_bytes: number;
  window: TelemetryWindowInfo;
}

/** `[unix seconds, value]`. */
export type StoredPoint = [number, number];

export interface StoredSeries {
  labels: Partial<Record<'pod' | 'container' | 'interface' | 'gpu', string>>;
  points: StoredPoint[];
}

export interface StoredMetric {
  /** Raw base unit (bytes, bytes_per_sec, cores, MiB, watts, percent, seconds, requests, tokens_per_sec). */
  unit?: string;
  aggregation?: 'sum' | 'avg';
  /** The per-run line. Never dropped. */
  aggregate: StoredPoint[];
  /** Per-bucket peak; gauge metrics only. */
  aggregate_max?: StoredPoint[];
  /** Per pod/container/interface/GPU expansion; dropped when `series_omitted`. */
  series?: StoredSeries[];
  series_omitted?: boolean;
}

export interface StoredTelemetry {
  schema_version: number;
  window: TelemetryWindowInfo;
  pods: string[];
  /** Keyed like `resource_utilization.metrics` / `inference.performance.metrics`; only metrics that returned data. */
  metrics: Record<string, StoredMetric>;
}
