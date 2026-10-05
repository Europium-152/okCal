import { parseDecimal } from '../parseDecimal';

describe('parseDecimal', () => {
  it.each([
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    [' 70,25 ', 70.25],
    ['.5', 0.5],
    [',5', 0.5],
    ['5.', 5],
    ['100', 100],
  ])('parses %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each([[''], ['  '], ['abc'], ['1.2.3x'], ['-'], [null], [undefined]])(
    'returns NaN for %p',
    input => {
      expect(parseDecimal(input as any)).toBeNaN();
    }
  );
});
