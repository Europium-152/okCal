import {
  formatDate,
  parseDate,
  formatDisplayDate,
  getTodayString,
  addDays,
} from '../dateHelpers';

describe('dateHelpers', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00');
      expect(formatDate(date)).toBe('2024-03-15');
    });

    it('should pad single digit month and day with zeros', () => {
      const date = new Date('2024-01-05T10:30:00');
      expect(formatDate(date)).toBe('2024-01-05');
    });

    it('should handle December correctly', () => {
      const date = new Date('2024-12-31T23:59:59');
      expect(formatDate(date)).toBe('2024-12-31');
    });

    it('should handle January 1st correctly', () => {
      const date = new Date('2024-01-01T00:00:00');
      expect(formatDate(date)).toBe('2024-01-01');
    });

    it('should handle leap year February 29th', () => {
      const date = new Date('2024-02-29T12:00:00');
      expect(formatDate(date)).toBe('2024-02-29');
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string to Date', () => {
      const dateString = '2024-03-15';
      const result = parseDate(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // 0-indexed
      expect(result.getDate()).toBe(15);
    });

    it('should parse ISO string with time', () => {
      const dateString = '2024-03-15T10:30:00';
      const result = parseDate(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });
  });

  describe('formatDisplayDate', () => {
    // Mock the current date for consistent testing
    const mockToday = new Date('2024-03-15T12:00:00');
    const originalDate = global.Date;

    beforeAll(() => {
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockToday.getTime());
          } else {
            // @ts-ignore
            super(...args);
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

    it('should return "Today" for today\'s date', () => {
      const result = formatDisplayDate('2024-03-15');
      expect(result).toBe('Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const result = formatDisplayDate('2024-03-14');
      expect(result).toBe('Yesterday');
    });

    it('should return the weekday for dates within 6 days', () => {
      expect(formatDisplayDate('2024-03-10')).toBe('Sunday');
      expect(formatDisplayDate('2024-03-09')).toBe('Saturday');
    });

    it('should return formatted date for dates more than 6 days away', () => {
      const result = formatDisplayDate('2024-03-08');
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/8/);
      expect(result).toMatch(/2024/);
    });

    it('should format date from previous year', () => {
      const result = formatDisplayDate('2023-12-25');
      expect(result).toMatch(/Dec/);
      expect(result).toMatch(/25/);
      expect(result).toMatch(/2023/);
    });
  });

  describe('getTodayString', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const result = getTodayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it matches today's actual date
      const today = new Date();
      const expected = formatDate(today);
      expect(result).toBe(expected);
    });
  });

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const date = new Date('2024-03-15T12:00:00');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-03-20');
    });

    it('should subtract days when given negative number', () => {
      const date = new Date('2024-03-15T12:00:00');
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2024-03-10');
    });

    it('should handle month boundary correctly (forward)', () => {
      const date = new Date('2024-03-28T12:00:00');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-04-02');
    });

    it('should handle month boundary correctly (backward)', () => {
      const date = new Date('2024-03-03T12:00:00');
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2024-02-27');
    });

    it('should handle year boundary correctly (forward)', () => {
      const date = new Date('2024-12-28T12:00:00');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2025-01-02');
    });

    it('should handle year boundary correctly (backward)', () => {
      const date = new Date('2024-01-03T12:00:00');
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2023-12-29');
    });

    it('should handle leap year February correctly', () => {
      const date = new Date('2024-02-27T12:00:00');
      const result = addDays(date, 3);
      expect(formatDate(result)).toBe('2024-03-01');
    });

    it('should handle non-leap year February correctly', () => {
      const date = new Date('2023-02-27T12:00:00');
      const result = addDays(date, 2);
      expect(formatDate(result)).toBe('2023-03-01');
    });

    it('should not modify the original date', () => {
      const original = new Date('2024-03-15T12:00:00');
      const originalString = formatDate(original);
      addDays(original, 5);
      expect(formatDate(original)).toBe(originalString);
    });

    it('should handle adding zero days', () => {
      const date = new Date('2024-03-15T12:00:00');
      const result = addDays(date, 0);
      expect(formatDate(result)).toBe('2024-03-15');
    });

    it('should handle adding large number of days', () => {
      const date = new Date('2024-01-01T12:00:00');
      const result = addDays(date, 365);
      expect(formatDate(result)).toBe('2024-12-31'); // 2024 is a leap year
    });
  });
});
