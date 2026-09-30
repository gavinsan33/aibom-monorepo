import type { AIBOMResource } from '../types/aibom';
import { getCollectedAt } from './aibomFields';
import { buildFieldRows } from './compareFields';
import { buildPerformanceRows } from './comparePerformance';
import { toCsv } from './csv';

export const aibomKey = (item: AIBOMResource): string =>
  `${item.metadata?.namespace ?? ''}/${item.metadata?.name ?? ''}`;

/**
 * Wide summary: one row per AIBOM, one column per field. Reuses the Compare
 * view's field list and performance rows so the export can't drift from what
 * the UI compares. A run whose own telemetry was unavailable leaves its
 * metric cells blank (not the meaningless 0 the recorded average defaults to).
 */
export function buildSummaryCsv(items: AIBOMResource[]): string {
  const fields = buildFieldRows(items);
  const performance = buildPerformanceRows(items);

  const header = [
    'aibom',
    'namespace',
    'name',
    'collected_at',
    ...fields.map((f) => f.label),
    ...performance.flatMap((row) => [`${row.label} (avg)`, `${row.label} (unit)`]),
  ];

  const rows = items.map((item, i) => [
    aibomKey(item),
    item.metadata?.namespace,
    item.metadata?.name,
    getCollectedAt(item),
    ...fields.map((f) => f.values[i]),
    ...performance.flatMap((row) => {
      const cell = row.values[i];
      return cell.unavailable ? ['', ''] : [cell.avg, cell.unit];
    }),
  ]);

  return toCsv([header, ...rows]);
}
