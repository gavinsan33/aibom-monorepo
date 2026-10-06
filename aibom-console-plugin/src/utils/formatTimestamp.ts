/**
 * Human-readable local date/time for an RFC 3339 timestamp; falls back to the
 * raw string if unparseable and to an em dash if missing.
 */
export function formatTimestamp(raw: string | undefined): string {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
