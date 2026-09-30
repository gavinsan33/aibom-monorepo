import {
  parseListState,
  parseSelected,
  serializeListState,
  serializeSelected,
} from './listUrlState';

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
      { filter: {}, sortKey: 'age', ascending: true },
      new URLSearchParams('foo=bar&model=old'),
    );
    expect(out.toString()).toBe('foo=bar');
  });

  it('defaults to newest-first (age ascending)', () => {
    expect(parseListState(new URLSearchParams(''), KEYS)).toEqual({
      filter: {},
      sortKey: 'age',
      ascending: true,
    });
  });

  it('round-trips oldest-first age and a non-default metric direction', () => {
    for (const state of [
      { filter: {}, sortKey: 'age' as const, ascending: false },
      { filter: {}, sortKey: 'cpu-usage' as const, ascending: false },
    ]) {
      expect(parseListState(serializeListState(state), KEYS)).toEqual(state);
    }
  });

  it('round-trips checked rows without disturbing filter/sort updates', () => {
    const withSelection = serializeSelected(new Set(['ns/a', 'ns/b']));
    expect(parseSelected(withSelection)).toEqual(new Set(['ns/a', 'ns/b']));
    const afterFilter = serializeListState(
      { filter: { model: 'granite' }, sortKey: 'age', ascending: true },
      withSelection,
    );
    expect(parseSelected(afterFilter)).toEqual(new Set(['ns/a', 'ns/b']));
    expect(serializeSelected(new Set(), afterFilter).has('selected')).toBe(false);
  });

  it('falls back to defaults for an unknown sort key', () => {
    expect(parseListState(new URLSearchParams('sort=bogus'), KEYS)).toEqual({
      filter: {},
      sortKey: 'age',
      ascending: true,
    });
  });
});
