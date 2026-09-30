import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('quotes cells containing commas, quotes or newlines, doubling quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('renders null/undefined as empty and other values as text', () => {
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(null)).toBe('');
    expect(csvCell(false)).toBe('false');
    expect(csvCell(12.5)).toBe('12.5');
  });

  it('neutralizes string cells that a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tx')).toBe("'\tx");
  });

  it('leaves real negative numbers numeric', () => {
    expect(csvCell(-3)).toBe('-3');
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF and a trailing CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 'x,y'],
      ]),
    ).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
