import { formatTimestamp } from './formatTimestamp';

describe('formatTimestamp', () => {
  it('formats a valid RFC 3339 timestamp without the raw ISO markers', () => {
    const out = formatTimestamp('2026-09-01T13:45:00Z');
    expect(out).toContain('2026');
    expect(out).not.toContain('T13');
  });

  it('returns the raw string when unparseable', () => {
    expect(formatTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
  });

  it('returns an em dash when missing', () => {
    expect(formatTimestamp(undefined)).toBe('—');
    expect(formatTimestamp('')).toBe('—');
  });
});
