/** A leading `=`, `+`, `-`, `@`, tab or CR makes Excel/Sheets evaluate the cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One RFC 4180 cell. `spec.data` is unvalidated user-controlled text (model
 * names, git branches, ...), so string cells that could run as a spreadsheet
 * formula get a leading `'` (CSV injection). Real numbers are left alone, so
 * negative values stay numeric.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvLine = (cells: unknown[]): string => cells.map(csvCell).join(',');

/** CRLF-terminated lines, per RFC 4180. */
export const toCsv = (rows: unknown[][]): string => rows.map(csvLine).join('\r\n') + '\r\n';

/**
 * Saves the CSV as `filename`. Accepts the text in pieces so a large file
 * never has to be joined into one string first. The UTF-8 BOM makes Excel
 * read non-ASCII text correctly.
 */
export function downloadCsv(filename: string, csv: string | string[]): void {
  const parts = typeof csv === 'string' ? [csv] : csv;
  const url = URL.createObjectURL(new Blob(['﻿', ...parts], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
