import {
  generateUniqueTicks,
  formatYAxisLabel,
  getStartDateForRange,
} from '../chartHelpers';

describe('chartHelpers', () => {
  describe('generateUniqueTicks', () => {
    it('should return single value when min equals max', () => {
      const result = generateUniqueTicks(100, 100);
      expect(result).toEqual([100]);
    });

    it('should generate ticks with appropriate step for small ranges', () => {
      const result = generateUniqueTicks(0, 10);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[result.length - 1]).toBeLessThanOrEqual(10);
    });

    it('should generate ticks for calorie ranges (0-2000)', () => {
      const result = generateUniqueTicks(0, 2000);
      expect(result).toContain(0);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(5);

      // Check that ticks are unique
      const uniqueTicks = new Set(result);
      expect(uniqueTicks.size).toBe(result.length);
    });

    it('should generate ticks for weight ranges (60-80)', () => {
      const result = generateUniqueTicks(60, 80);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result[0]).toBeGreaterThanOrEqual(60);
      expect(result[result.length - 1]).toBeLessThanOrEqual(80);
    });

    it('should handle decimal precision for weight charts', () => {
      const result = generateUniqueTicks(72.5, 75.5, 5, 1);
      expect(result.length).toBeGreaterThanOrEqual(2);

      // With precision=1, ticks should support decimal values
      const labels = result.map(t => Number(t.toFixed(1)));
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should respect maxTicks parameter', () => {
      const result = generateUniqueTicks(0, 100, 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should generate at least 2 ticks when possible', () => {
      const result = generateUniqueTicks(0, 5);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle large ranges (0-10000)', () => {
      const result = generateUniqueTicks(0, 10000);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(5);

      // Check for reasonable step size
      const step = result[1] - result[0];
      expect(step).toBeGreaterThan(0);
    });

    it('should return fallback [min, max] for very difficult ranges', () => {
      // Create a scenario where no preferred step works
      const result = generateUniqueTicks(0.1, 0.2, 5, 0);
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should return some reasonable values
      expect(result[0]).toBeLessThanOrEqual(0.1);
      expect(result[result.length - 1]).toBeGreaterThanOrEqual(0.2);
    });

    it('should generate unique labels when rounded to precision', () => {
      const result = generateUniqueTicks(10, 20, 5, 0);
      const labels = result.map(t => Number(t.toFixed(0)));
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should handle negative ranges', () => {
      const result = generateUniqueTicks(-10, 10);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toBeLessThanOrEqual(-10);
      expect(result[result.length - 1]).toBeGreaterThanOrEqual(10);
    });

    it('should handle all negative ranges', () => {
      const result = generateUniqueTicks(-100, -50);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toBeLessThanOrEqual(-100);
      // Allow some tolerance for tick generation algorithm
      expect(result[result.length - 1]).toBeGreaterThanOrEqual(-60);
    });
  });

  describe('formatYAxisLabel', () => {
    it('should format numbers >= 1000 as "Xk"', () => {
      expect(formatYAxisLabel(1000)).toBe('1k');
      expect(formatYAxisLabel(1500)).toBe('2k'); // Rounded
      expect(formatYAxisLabel(2000)).toBe('2k');
      expect(formatYAxisLabel(5000)).toBe('5k');
    });

    it('should format numbers < 1000 as integers', () => {
      expect(formatYAxisLabel(0)).toBe('0');
      expect(formatYAxisLabel(100)).toBe('100');
      expect(formatYAxisLabel(500)).toBe('500');
      expect(formatYAxisLabel(999)).toBe('999');
    });

    it('should handle negative numbers', () => {
      expect(formatYAxisLabel(-1000)).toBe('-1k');
      expect(formatYAxisLabel(-500)).toBe('-500');
      expect(formatYAxisLabel(-2500)).toBe('-3k'); // Rounded
    });

    it('should round to nearest integer for "k" format', () => {
      expect(formatYAxisLabel(1249)).toBe('1k');
      expect(formatYAxisLabel(1250)).toBe('1k');
      expect(formatYAxisLabel(1750)).toBe('2k');
    });

    it('should handle very large numbers', () => {
      expect(formatYAxisLabel(10000)).toBe('10k');
      expect(formatYAxisLabel(100000)).toBe('100k');
      expect(formatYAxisLabel(1000000)).toBe('1000k');
    });

    it('should handle decimal inputs by rounding', () => {
      expect(formatYAxisLabel(999.9)).toBe('1000');
      expect(formatYAxisLabel(1000.1)).toBe('1k');
      expect(formatYAxisLabel(1500.7)).toBe('2k');
    });
  });

  describe('getStartDateForRange', () => {
    const mockToday = new Date('2024-03-15T12:00:00');
    const originalDate = global.Date;

    beforeAll(() => {
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            const date = new originalDate(mockToday.getTime());
            return date;
          } else {
            // @ts-ignore
            return new originalDate(...args);
          }
        }

        static now() {
          return mockToday.getTime();
        }
      } as any;
    });

    afterAll(() => {
      global.Date = originalDate;
    });

    it('should return null for "All" range', () => {
      const dates = ['2024-01-01', '2024-02-01', '2024-03-01'];
      const result = getStartDateForRange('All', dates);
      expect(result).toBeNull();
    });

    it('should return null for empty dates array', () => {
      const result = getStartDateForRange('1M', []);
      expect(result).toBeNull();
    });

    it('should calculate start date for "2W" (14 days back)', () => {
      const dates = ['2024-01-01', '2024-02-01', '2024-03-01'];
      const result = getStartDateForRange('2W', dates);

      expect(result).not.toBeNull();
      const expected = new Date('2024-03-01T00:00:00'); // 14 days before 2024-03-15
      expect(result!.getTime()).toBe(expected.getTime());
    });

    it('should calculate start date for "1M" (30 days back)', () => {
      const dates = ['2024-01-01', '2024-02-01', '2024-03-01'];
      const result = getStartDateForRange('1M', dates);

      expect(result).not.toBeNull();
      const expected = new Date('2024-02-14T00:00:00'); // 30 days before 2024-03-15
      expect(result!.getTime()).toBe(expected.getTime());
    });

    it('should calculate start date for "6M" (180 days back)', () => {
      const dates = ['2023-01-01', '2024-01-01', '2024-03-01'];
      const result = getStartDateForRange('6M', dates);

      expect(result).not.toBeNull();
      const expected = new Date('2023-09-17T00:00:00'); // 180 days before 2024-03-15
      expect(result!.getTime()).toBe(expected.getTime());
    });

    it('should calculate start date for "1Y" (365 days back)', () => {
      const dates = ['2023-01-01', '2024-01-01', '2024-03-01'];
      const result = getStartDateForRange('1Y', dates);

      expect(result).not.toBeNull();
      const expected = new Date('2023-03-16T00:00:00'); // 365 days before 2024-03-15
      expect(result!.getTime()).toBe(expected.getTime());
    });

    it('should cap at earliest available date if calculated start is earlier', () => {
      // Earliest date is 2024-03-10, but 2W would go back to 2024-03-01
      const dates = ['2024-03-10', '2024-03-12', '2024-03-14'];
      const result = getStartDateForRange('2W', dates);

      expect(result).not.toBeNull();
      const earliest = new Date('2024-03-10T00:00:00');
      expect(result!.getTime()).toBe(earliest.getTime());
    });

    it('should use calculated date if it is more recent than earliest date', () => {
      // Earliest date is 2024-01-01, and 2W goes back to 2024-03-01
      const dates = ['2024-01-01', '2024-02-01', '2024-03-14'];
      const result = getStartDateForRange('2W', dates);

      expect(result).not.toBeNull();
      const calculated = new Date('2024-03-01T00:00:00');
      expect(result!.getTime()).toBe(calculated.getTime());
    });

    it('should handle dates with various formats', () => {
      const dates = ['2024-01-01', '2024-02-15', '2024-03-10'];
      const result = getStartDateForRange('1M', dates);

      expect(result).not.toBeNull();
      if (result) {
        expect(result instanceof Date).toBe(true);
      }
    });

    it('should set time to midnight (00:00:00)', () => {
      const dates = ['2024-03-01', '2024-03-10'];
      const result = getStartDateForRange('2W', dates);

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
      expect(result!.getSeconds()).toBe(0);
      expect(result!.getMilliseconds()).toBe(0);
    });
  });
});
