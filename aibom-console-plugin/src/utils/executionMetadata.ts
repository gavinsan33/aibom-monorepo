import type { AIBOMPod } from '../types/aibom';
import { toFlexNumber } from './flexible';

/**
 * Renders whole seconds as a compact Go-`time.Duration`-style string (e.g.
 * "1h5m30s", "45s") -- mirrors `oc-aibom`'s `ExecutionMetadata.Duration()`
 * closely enough for display purposes (this project's durations are always
 * whole seconds, so the sub-second-precision cases Go's own formatter
 * handles don't arise here). Returns `undefined` when unavailable, matching
 * `Duration()`'s `"-"` for a nil `DurationSeconds`.
 */
export function formatDuration(durationSeconds: unknown): string | undefined {
  const totalSeconds = toFlexNumber(durationSeconds);
  if (totalSeconds === undefined) return undefined;

  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) return `${hours.toFixed(0)}h${minutes.toFixed(0)}m${seconds.toFixed(0)}s`;
  if (minutes > 0) return `${minutes.toFixed(0)}m${seconds.toFixed(0)}s`;
  return `${seconds.toFixed(0)}s`;
}

/**
 * The `start_time` of whichever pod started first -- a JobSet can have
 * sibling pods that started at slightly different times. String comparison
 * is sufficient since `start_time` is always ISO-8601 in the same format,
 * where lexicographic order matches chronological order. Mirrors
 * `oc-aibom`'s `ExecutionMetadata.EarliestPodStart()`.
 */
export function earliestPodStart(pods: AIBOMPod[] | undefined): string | undefined {
  let earliest: string | undefined;
  for (const pod of pods ?? []) {
    if (!pod.start_time) continue;
    if (earliest === undefined || pod.start_time < earliest) {
      earliest = pod.start_time;
    }
  }
  return earliest;
}
