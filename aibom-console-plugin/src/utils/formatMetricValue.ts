const BYTE_STEPS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];

/** Suffix for units that need no scaling. */
const PLAIN_SUFFIX: Record<string, string> = {
  seconds: ' s',
  cores: ' cores',
  watts: ' W',
  percent: '%',
  tokens_per_sec: ' tok/s',
  requests: '',
};

const compact = (value: number): string => String(Number(value.toPrecision(3)));

function scaleBytes(value: number, startStep: number): { scaled: number; step: number } {
  let scaled = value;
  let step = startStep;
  while (Math.abs(scaled) >= 1024 && step < BYTE_STEPS.length - 1) {
    scaled /= 1024;
    step++;
  }
  return { scaled, step };
}

/**
 * Compact axis/tooltip value for a metric in the raw base unit the webhook
 * stores (`bytes`, `bytes_per_sec`, `MiB`, `cores`, `watts`, `percent`,
 * `seconds`, `requests`, `tokens_per_sec`); bytes-like units scale to
 * KiB/MiB/GiB. Unknown or missing units print the bare number.
 */
export function formatMetricValue(value: number, unit?: string): string {
  if (unit === 'bytes' || unit === 'bytes_per_sec' || unit === 'MiB') {
    const { scaled, step } = scaleBytes(value, unit === 'MiB' ? 2 : 0);
    return `${compact(scaled)} ${BYTE_STEPS[step]}${unit === 'bytes_per_sec' ? '/s' : ''}`;
  }
  return `${compact(value)}${unit ? (PLAIN_SUFFIX[unit] ?? '') : ''}`;
}
