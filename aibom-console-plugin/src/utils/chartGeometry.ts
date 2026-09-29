import type { RangePoint } from './prometheusRange';

/** Round `max` up to 1/2/5 x 10^n so axis ticks land on friendly numbers. */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  const fraction = max / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

export function linePath(
  points: RangePoint[],
  xScale: (x: number) => number,
  yScale: (y: number) => number,
): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`)
    .join('');
}

const BYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

/** Compact axis/tooltip value, scaled by the recorded AIBOM unit. */
export function formatAxisValue(value: number, unit?: string): string {
  if (unit === 'bytes' || unit === 'bytes_per_sec') {
    let scaled = value;
    let i = 0;
    while (Math.abs(scaled) >= 1024 && i < BYTE_UNITS.length - 1) {
      scaled /= 1024;
      i++;
    }
    return `${String(Number(scaled.toPrecision(3)))} ${BYTE_UNITS[i]}${unit === 'bytes_per_sec' ? '/s' : ''}`;
  }
  const text = Number(value.toPrecision(3)).toString();
  return unit === 'seconds' ? `${text} s` : text;
}
