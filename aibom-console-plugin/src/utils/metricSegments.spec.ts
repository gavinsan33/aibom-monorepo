import { segmentPctChange, slope, sparkline } from './metricSegments';

describe('segmentPctChange', () => {
  it('computes percent change normally', () => {
    expect(segmentPctChange(50, 100)).toBe(100);
    expect(segmentPctChange(100, 50)).toBe(-50);
  });

  it('handles a zero starting value without dividing by zero', () => {
    expect(segmentPctChange(0, 0)).toBe(0);
    expect(segmentPctChange(0, 5)).toBe(100);
    expect(segmentPctChange(0, -5)).toBe(-100);
  });
});

describe('slope', () => {
  it('is up/down/flat using a 10% threshold', () => {
    expect(slope(100, 111)).toBe('up');
    expect(slope(100, 89)).toBe('down');
    expect(slope(100, 105)).toBe('flat');
  });
});

describe('sparkline', () => {
  it('renders a steady climb', () => {
    expect(sparkline({ first_third: 10, middle_third: 20, last_third: 40 })).toBe('↗↗');
  });

  it('renders a dip then recover', () => {
    expect(sparkline({ first_third: 100, middle_third: 50, last_third: 100 })).toBe('↘↗');
  });

  it('renders flat when changes stay within the threshold', () => {
    expect(sparkline({ first_third: 100, middle_third: 102, last_third: 99 })).toBe('→→');
  });

  it('returns an empty string unless all three thirds are present', () => {
    expect(sparkline({ first_third: 10, middle_third: 20 })).toBe('');
    expect(sparkline({})).toBe('');
    expect(sparkline(undefined)).toBe('');
  });
});
