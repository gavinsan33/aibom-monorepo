import { toFlexNumber } from './flexible';

describe('toFlexNumber', () => {
  it('accepts a plain number', () => {
    expect(toFlexNumber(42)).toBe(42);
  });

  it('accepts a numeric-looking string', () => {
    expect(toFlexNumber('42')).toBe(42);
    expect(toFlexNumber('  3.14 ')).toBeCloseTo(3.14);
  });

  it('returns undefined for a non-numeric string', () => {
    expect(toFlexNumber('not-a-number')).toBeUndefined();
  });

  it('returns undefined for missing/null/empty values', () => {
    expect(toFlexNumber(undefined)).toBeUndefined();
    expect(toFlexNumber(null)).toBeUndefined();
    expect(toFlexNumber('')).toBeUndefined();
  });

  it('returns undefined for non-finite numbers', () => {
    expect(toFlexNumber(NaN)).toBeUndefined();
    expect(toFlexNumber(Infinity)).toBeUndefined();
  });
});
