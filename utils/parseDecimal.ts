/**
 * Parses a user-typed decimal, accepting either "." or "," as the decimal
 * separator (keyboards differ by locale). Returns NaN for invalid input.
 * If both separators appear, the last one is the decimal separator and the
 * other is treated as a thousands separator.
 */
export function parseDecimal(input: string | null | undefined): number {
  if (input == null) return NaN;
  const s = String(input).trim().replace(/\s/g, '');
  if (s === '') return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const normalized =
    lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized) ? parseFloat(normalized) : NaN;
}
