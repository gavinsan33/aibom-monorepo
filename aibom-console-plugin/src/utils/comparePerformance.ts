import type { AIBOMResource } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, HARDWARE_METRIC_ORDER } from '../types/aibom';
import { getMetricAvg, getMetricUnit, getResourceUtilizationNote } from './aibomFields';
import { sparkline } from './metricSegments';

export interface PerformanceCell {
  avg: number;
  unit: string;
  sparkline: string;
  /** True when this item's own telemetry was unavailable (`resource_utilization.note` set) -- the avg is a meaningless 0 in that case, render "—" instead. */
  unavailable: boolean;
}

export interface PerformanceRow {
  metricKey: string;
  label: string;
  values: PerformanceCell[];
  /** Only populated when exactly 2 items are compared, mirroring `oc-aibom diff`'s pairwise-only Delta/% Change columns. */
  delta?: number;
  pctChange?: number;
}

const metricSegments = (a: AIBOMResource, metricKey: string) =>
  a.spec?.data?.resource_utilization?.metrics?.[metricKey]?.segments;

/**
 * One row per hardware metric, one value per selected item -- mirrors
 * `oc-aibom`'s `DiffPerformance` (2 items: value + delta/pct-change) and
 * `compare` (N items: value only), unified into a single N-scalable shape
 * with `diff`'s sparkline annotation added even at N>2.
 */
export function buildPerformanceRows(items: AIBOMResource[]): PerformanceRow[] {
  return HARDWARE_METRIC_ORDER.map((metricKey) => {
    const values = items.map((item) => ({
      avg: getMetricAvg(item, metricKey),
      unit: getMetricUnit(item, metricKey),
      sparkline: sparkline(metricSegments(item, metricKey)),
      unavailable: getResourceUtilizationNote(item) !== '',
    }));

    const row: PerformanceRow = {
      metricKey,
      label: HARDWARE_METRIC_LABELS[metricKey] ?? metricKey,
      values,
    };

    if (items.length === 2) {
      const [a, b] = values;
      row.delta = b.avg - a.avg;
      row.pctChange = a.avg === 0 ? undefined : ((b.avg - a.avg) / a.avg) * 100;
    }

    return row;
  });
}
