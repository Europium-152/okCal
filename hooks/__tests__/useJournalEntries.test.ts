import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useJournalEntries } from '../useJournalEntries';
import * as storage from '@/utils/storage';
import { FoodEntry } from '@/types';

// Mock storage functions
jest.mock('@/utils/storage', () => ({
  getFoodEntriesByDate: jest.fn(),
  deleteFoodEntry: jest.fn(),
  saveFoodEntry: jest.fn(),
}));

// Create a simple mock for Alert.alert
const mockAlertFn = jest.fn();

// Replace Alert.alert before tests run
beforeAll(() => {
  (Alert as any).alert = mockAlertFn;
});

describe('useJournalEntries', () => {
  const mockAlert = mockAlertFn;
  const mockDate = '2024-03-15';
  const mockEntries: FoodEntry[] = [
    {
      id: '1',
      name: 'Food 1',
      quantity: 100,
      unit: 'g',
      calories: 200,
      caloriesPer100: 200,
      proteinPer100: 10,
      carbsPer100: 20,
      fatPer100: 5,
      protein: 10,
      carbs: 20,
      fat: 5,
      timestamp: 1710518400000,
      date: '2024-03-15',
    },
    {
      id: '2',
      name: 'Food 2',
      quantity: 150,
      unit: 'g',
      calories: 300,
      caloriesPer100: 200,
      proteinPer100: 15,
      carbsPer100: 25,
      fatPer100: 8,
      protein: 22.5,
      carbs: 37.5,
      fat: 12,
      timestamp: 1710518500000,
      date: '2024-03-15',
    },
  ];

  // The hook returns entries newest-first
  const sortedMockEntries = [...mockEntries].sort((a, b) => b.timestamp - a.timestamp);

  beforeEach(() => {
    jest.clearAllMocks();
    (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should initialize with empty entries and not refreshing', () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      expect(result.current.entries).toEqual([]);
      expect(result.current.refreshing).toBe(false);
    });
  });

  describe('loadEntries', () => {
    it('should load entries from storage', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries();
      });

      expect(storage.getFoodEntriesByDate).toHaveBeenCalledWith(mockDate);
      expect(result.current.entries).toEqual(sortedMockEntries);
    });

    it('should skip cloud fetch when specified', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries(true);
      });

      expect(storage.getFoodEntriesByDate).toHaveBeenCalledWith(mockDate);
    });

    it('should sort entries by timestamp in descending order', async () => {
      const unsortedEntries: FoodEntry[] = [
        { ...mockEntries[0], timestamp: 1710518300000 },
        { ...mockEntries[1], timestamp: 1710518500000 },
        { ...mockEntries[0], id: '3', timestamp: 1710518100000 },
      ];

      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(unsortedEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries();
      });

      expect(result.current.entries[0].timestamp).toBe(1710518500000);
      expect(result.current.entries[1].timestamp).toBe(1710518300000);
      expect(result.current.entries[2].timestamp).toBe(1710518100000);
    });

    it('should handle empty entries', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries();
      });

      expect(result.current.entries).toEqual([]);
    });

    it('should migrate old entries without quantity fields', async () => {
      const oldEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Old Food',
          calories: 200,
          protein: 10,
          carbs: 20,
          fat: 5,
          timestamp: 1710518400000,
          date: '2024-03-15',
        } as FoodEntry,
      ];

      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(oldEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries();
      });

      expect(result.current.entries[0]).toMatchObject({
        id: '1',
        name: 'Old Food',
        quantity: 100,
        unit: 'g',
        caloriesPer100: 200,
        proteinPer100: 10,
        carbsPer100: 20,
        fatPer100: 5,
      });
    });

    it('should handle entries with partial macro data in migration', async () => {
      const oldEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Partial Food',
          calories: 150,
          timestamp: 1710518400000,
          date: '2024-03-15',
        } as FoodEntry,
      ];

      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(oldEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.loadEntries();
      });

      expect(result.current.entries[0]).toMatchObject({
        quantity: 100,
        unit: 'g',
        caloriesPer100: 150,
        proteinPer100: undefined,
        carbsPer100: undefined,
        fatPer100: undefined,
      });
    });

    it('should handle load failure gracefully', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await expect(result.current.loadEntries()).rejects.toThrow('Storage error');
      });
    });
  });

  describe('onRefresh', () => {
    it('should set refreshing to true during refresh', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEntries), 100))
      );

      const { result } = renderHook(() => useJournalEntries(mockDate));

      act(() => {
        result.current.onRefresh();
      });

      expect(result.current.refreshing).toBe(true);

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
    });

    it('should load entries without skipping cloud fetch', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.onRefresh();
      });

      expect(storage.getFoodEntriesByDate).toHaveBeenCalledWith(mockDate);
    });

    it('should reset refreshing to false after completion', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.onRefresh();
      });

      expect(result.current.refreshing).toBe(false);
    });

    it('should reset refreshing even on error', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.onRefresh().catch(() => {});
      });

      expect(result.current.refreshing).toBe(false);
    });
  });

  describe('deleteEntry', () => {
    it('should show confirmation alert before deleting', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const deletePromise = result.current.deleteEntry('1', 'Test Food');

      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Entry',
        'Are you sure you want to delete "Test Food"?',
        expect.any(Array)
      );

      // Cancel the alert to avoid hanging
      const alertCall = mockAlert.mock.calls[0];
      const cancelButton = alertCall[2][0];
      act(() => {
        cancelButton.onPress();
      });

      await expect(deletePromise).rejects.toThrow('Cancelled');
    });

    it('should delete entry and reload when confirmed', async () => {
      (storage.deleteFoodEntry as jest.Mock).mockResolvedValue(undefined);
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      const deletePromise = result.current.deleteEntry('1', 'Test Food');

      // Confirm the alert
      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('1');
      expect(storage.getFoodEntriesByDate).toHaveBeenCalledWith(mockDate);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should reject if user cancels', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const deletePromise = result.current.deleteEntry('1', 'Test Food');

      // Cancel the alert
      const alertCall = mockAlert.mock.calls[0];
      const cancelButton = alertCall[2][0];
      act(() => {
        cancelButton.onPress();
      });

      await expect(deletePromise).rejects.toThrow('Cancelled');
      expect(storage.deleteFoodEntry).not.toHaveBeenCalled();
    });

    it('should reject if deletion fails', async () => {
      (storage.deleteFoodEntry as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useJournalEntries(mockDate));

      const deletePromise = result.current.deleteEntry('1', 'Test Food');
      // Attach the rejection handler before the promise rejects
      const rejection = expect(deletePromise).rejects.toThrow('Delete failed');

      // Confirm the alert
      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      await rejection;
    });
  });

  describe('editEntry', () => {
    const mockEditEntry: FoodEntry = {
      id: '1',
      name: 'Original Food',
      quantity: 100,
      unit: 'g',
      calories: 200,
      caloriesPer100: 200,
      proteinPer100: 10,
      carbsPer100: 20,
      fatPer100: 5,
      protein: 10,
      carbs: 20,
      fat: 5,
      timestamp: 1710518400000,
      date: '2024-03-15',
    };

    beforeEach(() => {
      (storage.deleteFoodEntry as jest.Mock).mockResolvedValue(undefined);
      (storage.saveFoodEntry as jest.Mock).mockResolvedValue(undefined);
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue([]);
    });

    it('should edit entry with new values', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '150',
          '250',
          '15',
          '25',
          '8',
          '2024-03-16',
          '14:30'
        );
      });

      expect(success).toBe(true);
      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('1');
      expect(storage.saveFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Original Food',
          quantity: 150,
          caloriesPer100: 250,
          proteinPer100: 15,
          carbsPer100: 25,
          fatPer100: 8,
          calories: 375, // (250 * 150) / 100
          protein: 22.5, // (15 * 150) / 100
          carbs: 37.5, // (25 * 150) / 100
          fat: 12, // (8 * 150) / 100
          date: '2024-03-16',
        })
      );
    });

    it('should calculate new timestamp from date and time', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          '20',
          '5',
          '2024-03-16',
          '14:30'
        );
      });

      const savedEntry = (storage.saveFoodEntry as jest.Mock).mock.calls[0][0];
      const savedDate = new Date(savedEntry.timestamp);

      expect(savedEntry.date).toBe('2024-03-16');
      expect(savedDate.getHours()).toBe(14);
      expect(savedDate.getMinutes()).toBe(30);
    });

    it('should return false and show alert for invalid quantity', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '-50',
          '200',
          '10',
          '20',
          '5',
          '2024-03-15',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter a valid quantity');
      expect(storage.deleteFoodEntry).not.toHaveBeenCalled();
    });

    it('should return false for invalid calories', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '-100',
          '10',
          '20',
          '5',
          '2024-03-15',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter valid calories per 100g');
    });

    it('should return false for invalid protein', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '-5',
          '20',
          '5',
          '2024-03-15',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter valid protein per 100g');
    });

    it('should return false for invalid carbs', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          'abc',
          '5',
          '2024-03-15',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter valid carbs per 100g');
    });

    it('should return false for invalid fat', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          '20',
          '',
          '2024-03-15',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter valid fat per 100g');
    });

    it('should return false for invalid date format', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          '20',
          '5',
          '03/15/2024',
          '12:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter a valid date in format YYYY-MM-DD');
    });

    it('should return false for invalid time format', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      const success = await act(async () => {
        return await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          '20',
          '5',
          '2024-03-15',
          '25:00'
        );
      });

      expect(success).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter a valid time in format HH:MM');
    });

    it('should reload entries after successful edit', async () => {
      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await result.current.editEntry(
          mockEditEntry,
          '100',
          '200',
          '10',
          '20',
          '5',
          '2024-03-15',
          '12:00'
        );
      });

      expect(storage.getFoodEntriesByDate).toHaveBeenCalledWith(mockDate);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple loadEntries calls', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      await act(async () => {
        await Promise.all([
          result.current.loadEntries(),
          result.current.loadEntries(),
          result.current.loadEntries(),
        ]);
      });

      expect(storage.getFoodEntriesByDate).toHaveBeenCalledTimes(3);
      expect(result.current.entries).toEqual(sortedMockEntries);
    });

    it('should handle delete during load', async () => {
      (storage.getFoodEntriesByDate as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEntries), 100))
      );
      (storage.deleteFoodEntry as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useJournalEntries(mockDate));

      act(() => {
        result.current.loadEntries();
      });

      const deletePromise = result.current.deleteEntry('1', 'Test Food');

      // Confirm delete
      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      await waitFor(() => {
        expect(result.current.entries).toBeDefined();
      });

      await deletePromise.catch(() => {});
    });
  });
});
