import { formatAxisValue, niceMax } from './chartGeometry';

describe('chartGeometry', () => {
  it('rounds max up to a friendly number', () => {
    expect(niceMax(0.73)).toBe(1);
    expect(niceMax(1.2)).toBe(2);
    expect(niceMax(37)).toBe(50);
    expect(niceMax(0)).toBe(1);
  });

  it('formats bytes and seconds by unit', () => {
    expect(formatAxisValue(2048, 'bytes')).toBe('2 KiB');
    expect(formatAxisValue(1024 * 1024, 'bytes_per_sec')).toBe('1 MiB/s');
    expect(formatAxisValue(0.25, 'seconds')).toBe('0.25 s');
    expect(formatAxisValue(3.14159)).toBe('3.14');
  });
});
