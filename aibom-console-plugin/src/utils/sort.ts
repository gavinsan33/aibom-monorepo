import type { AIBOMResource, SortKey } from '../types/aibom';
import { SORTABLE_METRICS } from '../types/aibom';
import { getCollectedAt, getMetricAvg } from './aibomFields';

/**
 * Sorts by the named performance metric's average, descending (highest
 * first) unless `ascending`. A metric never collected for an item defaults
 * to 0 rather than excluding the item -- mirrors `oc-aibom`'s
 * `SortByMetric`/`MetricAvg` (`internal/aibom/sort.go`). Stable (ties
 * preserve input order).
 */
export function sortByMetric(
  items: AIBOMResource[],
  metric: keyof typeof SORTABLE_METRICS,
  ascending: boolean,
): AIBOMResource[] {
  const metricKey = SORTABLE_METRICS[metric];
  return [...items].sort((a, b) => {
    const va = getMetricAvg(a, metricKey);
    const vb = getMetricAvg(b, metricKey);
    return ascending ? va - vb : vb - va;
  });
}

/**
 * Sorts by `collectedAt` (RFC 3339). Default order is oldest-first;
 * `ascending` reverses to most-recently-collected first. Items with an
 * unparseable/missing `collectedAt` always sort last, regardless of
 * direction. Mirrors `oc-aibom`'s `SortByAge`. Stable (ties preserve input
 * order).
 */
export function sortByAge(items: AIBOMResource[], ascending: boolean): AIBOMResource[] {
  const parse = (a: AIBOMResource): number | undefined => {
    const raw = getCollectedAt(a);
    if (!raw) return undefined;
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? undefined : ms;
  };

  return [...items].sort((a, b) => {
    const ta = parse(a);
    const tb = parse(b);
    if (ta === undefined || tb === undefined) {
      if (ta === undefined && tb === undefined) return 0;
      // Whichever side is unparseable sorts last, in both directions.
      return ta === undefined ? 1 : -1;
    }
    return ascending ? tb - ta : ta - tb;
  });
}

export function sortItems(
  items: AIBOMResource[],
  sortKey: SortKey,
  ascending: boolean,
): AIBOMResource[] {
  return sortKey === 'age' ? sortByAge(items, ascending) : sortByMetric(items, sortKey, ascending);
}
