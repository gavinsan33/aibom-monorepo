import type { MetricSegments } from '../types/aibom';
import { toFlexNumber } from './flexible';

/**
 * `(to-from)/from*100`, with a from-is-zero fallback so a move away from (or
 * between) all-zero segments still has a sign instead of dividing by zero.
 * Mirrors `oc-aibom`'s `segmentPctChange` (`internal/aibom/types.go`).
 */
export function segmentPctChange(from: number, to: number): number {
  if (from === 0) {
    if (to === 0) return 0;
    return to > 0 ? 100 : -100;
  }
  return ((to - from) / from) * 100;
}

export type Slope = 'up' | 'down' | 'flat';

/** A first->second transition, using the same ±10% threshold as `oc-aibom`'s `slopeSymbol`. */
export function slope(from: number, to: number): Slope {
  const pct = segmentPctChange(from, to);
  if (pct > 10) return 'up';
  if (pct < -10) return 'down';
  return 'flat';
}

export const SLOPE_SYMBOL: Record<Slope, string> = { up: '↗', down: '↘', flat: '→' };

/**
 * Renders a run's first/middle/last-third shape as a compact two-arrow
 * string (e.g. "↘↗" for a dip-then-recover, "↗↗" for a steady climb).
 * Mirrors `oc-aibom`'s `MetricSegments.Sparkline()`. Returns `''` unless all
 * three thirds are present.
 */
export function sparkline(segments: MetricSegments | undefined): string {
  const first = toFlexNumber(segments?.first_third);
  const middle = toFlexNumber(segments?.middle_third);
  const last = toFlexNumber(segments?.last_third);
  if (first === undefined || middle === undefined || last === undefined) {
    return '';
  }
  return SLOPE_SYMBOL[slope(first, middle)] + SLOPE_SYMBOL[slope(middle, last)];
}
