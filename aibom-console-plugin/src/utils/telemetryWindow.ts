import type { AIBOMResource } from '../types/aibom';
import { earliestPodStart } from './executionMetadata';

export interface TelemetryWindow {
  podNames: string[];
  startMs: number;
  endMs: number;
  /** False when the run has no usable start/end, so no query can be pinned to it. */
  hasWindow: boolean;
}

/**
 * The run's telemetry window: earliest pod start (cold start included) to
 * `spec.collectedAt`, plus its pod names.
 */
export function getTelemetryWindow(item: AIBOMResource): TelemetryWindow {
  const pods = item.spec?.data?.execution_metadata?.pods ?? [];
  const podNames = pods.map((pod) => pod.pod_name).filter((name): name is string => Boolean(name));

  const start = earliestPodStart(pods);
  const end = item.spec?.collectedAt;
  // If start_time lacks timezone indicator, assume UTC
  const startMs = start ? Date.parse(start.endsWith('Z') ? start : start + 'Z') : NaN;
  const endMs = end ? Date.parse(end) : NaN;
  const hasWindow = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs;
  return { podNames, startMs, endMs, hasWindow };
}
