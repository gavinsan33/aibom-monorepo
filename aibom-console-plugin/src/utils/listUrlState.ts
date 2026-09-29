import type { SortKey } from '../types/aibom';
import type { AIBOMFilter } from './filter';

/**
 * List view filter/sort <-> URL query string, so the state survives
 * navigating to a detail page and back (the list page unmounts).
 */

const STRING_FILTERS = [
  'model',
  'intent',
  'quantization',
  'architecture',
  'framework',
  'gpuType',
  'jobName',
  'gitBranch',
  'gitRepository',
  'servingEngine',
  'adaptationMethod',
  'optimizer',
] as const;

export interface ListUrlState {
  filter: AIBOMFilter;
  sortKey: SortKey;
  ascending: boolean;
}

export const DEFAULT_SORT_KEY: SortKey = 'age';

/**
 * Age sorts "ascending" = youngest (most recently collected) first, mirroring
 * `oc-aibom`'s `SortByAge`, so newest-first is the default direction for age.
 * Metrics default to highest-first (descending).
 */
export const defaultAscending = (key: SortKey): boolean => key === 'age';

export function parseListState(
  params: URLSearchParams,
  validSortKeys: readonly string[],
): ListUrlState {
  const filter: AIBOMFilter = {};
  for (const key of STRING_FILTERS) {
    const value = params.get(key);
    if (value) filter[key] = value;
  }
  if (params.get('driftOnly') === '1') filter.driftOnly = true;
  const sort = params.get('sort');
  const sortKey = sort && validSortKeys.includes(sort) ? (sort as SortKey) : DEFAULT_SORT_KEY;
  const asc = params.get('asc');
  return {
    filter,
    sortKey,
    ascending: asc === null ? defaultAscending(sortKey) : asc === '1',
  };
}

/** Writes state onto `base`, keeping unrelated params and omitting defaults. */
export function serializeListState(state: ListUrlState, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const key of [...STRING_FILTERS, 'driftOnly', 'sort', 'asc']) params.delete(key);
  for (const key of STRING_FILTERS) {
    const value = state.filter[key];
    if (value) params.set(key, value);
  }
  if (state.filter.driftOnly) params.set('driftOnly', '1');
  if (state.sortKey !== DEFAULT_SORT_KEY) params.set('sort', state.sortKey);
  if (state.ascending !== defaultAscending(state.sortKey)) {
    params.set('asc', state.ascending ? '1' : '0');
  }
  return params;
}
