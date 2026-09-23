/**
 * `spec.data`'s numeric fields sometimes arrive as a numeric-looking string
 * instead of a JSON number (e.g. postprocess.py's CLI-arg parsing falling
 * back to the raw string on a failed int()/float() conversion) -- mirrors
 * `oc-aibom`'s `FlexInt`/`FlexFloat` (`internal/aibom/flexible.go`).
 *
 * Unlike the Go unmarshalers (which decode an unparseable value to zero
 * since that's a no-op unmarshal failure), callers here get `undefined` for
 * unparseable input so they can choose their own fallback -- e.g. sorting
 * treats a missing metric as 0, while display should show "--".
 */
export function toFlexNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
