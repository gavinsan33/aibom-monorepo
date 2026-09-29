import { parseListState, serializeListState } from './listUrlState';

const KEYS = ['age', 'cpu-usage'];

describe('listUrlState', () => {
  it('round-trips filters and sort', () => {
    const state = {
      filter: { model: 'granite', gpuType: 'A100', driftOnly: true },
      sortKey: 'cpu-usage' as const,
      ascending: true,
    };
    expect(parseListState(serializeListState(state), KEYS)).toEqual(state);
  });

  it('omits defaults and preserves unrelated params', () => {
    const out = serializeListState(
      { filter: {}, sortKey: 'age', ascending: false },
      new URLSearchParams('foo=bar&model=old'),
    );
    expect(out.toString()).toBe('foo=bar');
  });

  it('falls back to defaults for an unknown sort key', () => {
    expect(parseListState(new URLSearchParams('sort=bogus'), KEYS)).toEqual({
      filter: {},
      sortKey: 'age',
      ascending: false,
    });
  });
});
