import { renderHook, act } from '@testing-library/react-native';
import { useDateTimeEntry } from '../useDateTimeEntry';

// Mock dateHelpers
jest.mock('@/utils/dateHelpers', () => ({
  getTodayString: jest.fn(() => '2024-03-15'),
}));

describe('useDateTimeEntry', () => {
  const mockNow = new Date('2024-03-15T14:30:00');
  const originalDate = global.Date;

  beforeAll(() => {
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          const date = new originalDate(mockNow.getTime());
          return date;
        } else {
          // @ts-ignore
          return new originalDate(...args);
        }
      }

      static now() {
        return mockNow.getTime();
      }
    } as any;
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  it('should initialize with today\'s date and current time', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    expect(result.current.entryDate).toBe('2024-03-15');
    expect(result.current.entryTime).toBe('14:30');
  });

  it('should initialize with provided initial date', () => {
    const { result } = renderHook(() => useDateTimeEntry('2024-01-01'));

    expect(result.current.entryDate).toBe('2024-01-01');
    expect(result.current.entryTime).toBe('14:30'); // Still uses current time
  });

  it('should update date when setEntryDate is called', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-20');
    });

    expect(result.current.entryDate).toBe('2024-03-20');
  });

  it('should update time when setEntryTime is called', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryTime('18:45');
    });

    expect(result.current.entryTime).toBe('18:45');
  });

  it('should reset to current date and time when resetToNow is called', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    // Change date and time
    act(() => {
      result.current.setEntryDate('2023-01-01');
      result.current.setEntryTime('09:00');
    });

    expect(result.current.entryDate).toBe('2023-01-01');
    expect(result.current.entryTime).toBe('09:00');

    // Reset to now
    act(() => {
      result.current.resetToNow();
    });

    expect(result.current.entryDate).toBe('2024-03-15');
    expect(result.current.entryTime).toBe('14:30');
  });

  it('should calculate correct timestamp from date and time', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('14:30');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-03-15T14:30:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should calculate timestamp for different dates', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-01-01');
      result.current.setEntryTime('00:00');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-01-01T00:00:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should calculate timestamp for different times', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('23:59');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-03-15T23:59:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should handle midnight time correctly', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('00:00');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-03-15T00:00:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should handle noon time correctly', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('12:00');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-03-15T12:00:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should update timestamp when date changes', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('14:30');
    });

    const timestamp1 = result.current.getTimestamp();

    act(() => {
      result.current.setEntryDate('2024-03-16');
    });

    const timestamp2 = result.current.getTimestamp();

    expect(timestamp2).toBeGreaterThan(timestamp1);
    expect(timestamp2 - timestamp1).toBe(24 * 60 * 60 * 1000); // 1 day difference
  });

  it('should update timestamp when time changes', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('14:30');
    });

    const timestamp1 = result.current.getTimestamp();

    act(() => {
      result.current.setEntryTime('15:30');
    });

    const timestamp2 = result.current.getTimestamp();

    expect(timestamp2).toBeGreaterThan(timestamp1);
    expect(timestamp2 - timestamp1).toBe(60 * 60 * 1000); // 1 hour difference
  });

  it('should handle single digit hours and minutes in time', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-03-15');
      result.current.setEntryTime('9:5');
    });

    const timestamp = result.current.getTimestamp();
    const expectedDate = new Date('2024-03-15T09:05:00');

    expect(timestamp).toBe(expectedDate.getTime());
  });

  it('should provide independent setters', () => {
    const { result } = renderHook(() => useDateTimeEntry());

    act(() => {
      result.current.setEntryDate('2024-01-01');
    });

    expect(result.current.entryDate).toBe('2024-01-01');
    expect(result.current.entryTime).toBe('14:30'); // Time unchanged

    act(() => {
      result.current.setEntryTime('10:00');
    });

    expect(result.current.entryDate).toBe('2024-01-01'); // Date unchanged
    expect(result.current.entryTime).toBe('10:00');
  });
});
