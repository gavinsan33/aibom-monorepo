import { formatMetricValue } from './formatMetricValue';

describe('formatMetricValue', () => {
  it('scales bytes-like units', () => {
    expect(formatMetricValue(2048, 'bytes')).toBe('2 KiB');
    expect(formatMetricValue(1024 * 1024, 'bytes_per_sec')).toBe('1 MiB/s');
    expect(formatMetricValue(2048, 'MiB')).toBe('2 GiB');
    expect(formatMetricValue(512, 'MiB')).toBe('512 MiB');
  });

  it('adds suffixes for plain units', () => {
    expect(formatMetricValue(0.25, 'seconds')).toBe('0.25 s');
    expect(formatMetricValue(3.14159, 'cores')).toBe('3.14 cores');
    expect(formatMetricValue(250, 'watts')).toBe('250 W');
    expect(formatMetricValue(87.5, 'percent')).toBe('87.5%');
  });

  it('prints the bare number for unknown or missing units', () => {
    expect(formatMetricValue(3.14159)).toBe('3.14');
    expect(formatMetricValue(7, 'mystery')).toBe('7');
  });
});
