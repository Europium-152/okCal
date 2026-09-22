import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveFoodEntry,
  getFoodEntries,
  getFoodEntriesByDate,
  deleteFoodEntry,
  saveFoodEntries,
  addDataChangeListener,
  generateTDEEDataHash,
  generateWeightDataHash,
} from '../storage';
import { FoodEntry, WeightEntry, FastingDay, UserProfile } from '@/types';

describe('storage', () => {
  beforeEach(() => {
    // Clear all AsyncStorage mocks before each test
    jest.clearAllMocks();

    // Advance time to clear the cache between tests
    // The cache duration is 60 seconds, so advancing by 61 seconds ensures cache is expired
    jest.advanceTimersByTime(61000);
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('saveFoodEntry', () => {
    it('should save food entry to AsyncStorage', async () => {
      const mockEntry: FoodEntry = {
        id: '1',
        name: 'Test Food',
        quantity: 100,
        unit: 'g',
        calories: 200,
        caloriesPer100: 200,
        timestamp: Date.now(),
        date: '2024-03-15',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await saveFoodEntry(mockEntry);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify([mockEntry])
      );
    });

    it('should append to existing entries', async () => {
      const existingEntry: FoodEntry = {
        id: '1',
        name: 'Existing Food',
        quantity: 100,
        unit: 'g',
        calories: 150,
        caloriesPer100: 150,
        timestamp: Date.now(),
        date: '2024-03-14',
      };

      const newEntry: FoodEntry = {
        id: '2',
        name: 'New Food',
        quantity: 200,
        unit: 'g',
        calories: 300,
        caloriesPer100: 150,
        timestamp: Date.now(),
        date: '2024-03-15',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingEntry])
      );

      await saveFoodEntry(newEntry);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify([existingEntry, newEntry])
      );
    });

    it('should handle AsyncStorage errors', async () => {
      const mockEntry: FoodEntry = {
        id: '1',
        name: 'Test Food',
        quantity: 100,
        unit: 'g',
        calories: 200,
        caloriesPer100: 200,
        timestamp: Date.now(),
        date: '2024-03-15',
      };

      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(saveFoodEntry(mockEntry)).rejects.toThrow('Storage error');
    });
  });

  describe('getFoodEntries', () => {
    it('should return empty array when no entries exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getFoodEntries();

      expect(result).toEqual([]);
    });

    it('should return all food entries', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
        {
          id: '2',
          name: 'Food 2',
          quantity: 150,
          unit: 'g',
          calories: 300,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEntries)
      );

      const result = await getFoodEntries();

      expect(result).toEqual(mockEntries);
    });

    it('should return empty array on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await getFoodEntries();

      expect(result).toEqual([]);
    });
  });

  describe('getFoodEntriesByDate', () => {
    it('should filter entries by date', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
        {
          id: '2',
          name: 'Food 2',
          quantity: 150,
          unit: 'g',
          calories: 300,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-16',
        },
        {
          id: '3',
          name: 'Food 3',
          quantity: 100,
          unit: 'g',
          calories: 150,
          caloriesPer100: 150,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEntries)
      );

      const result = await getFoodEntriesByDate('2024-03-15');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should return empty array when no entries match date', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEntries)
      );

      const result = await getFoodEntriesByDate('2024-03-20');

      expect(result).toEqual([]);
    });
  });

  describe('deleteFoodEntry', () => {
    it('should delete entry by id', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
        {
          id: '2',
          name: 'Food 2',
          quantity: 150,
          unit: 'g',
          calories: 300,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEntries)
      );

      await deleteFoodEntry('1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify([mockEntries[1]])
      );
    });

    it('should handle deleting non-existent entry', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockEntries)
      );

      await deleteFoodEntry('999');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify(mockEntries)
      );
    });
  });

  describe('saveFoodEntries', () => {
    it('should save all entries at once', async () => {
      const mockEntries: FoodEntry[] = [
        {
          id: '1',
          name: 'Food 1',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
        {
          id: '2',
          name: 'Food 2',
          quantity: 150,
          unit: 'g',
          calories: 300,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: '2024-03-15',
        },
      ];

      await saveFoodEntries(mockEntries);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify(mockEntries)
      );
    });

    it('should save empty array', async () => {
      await saveFoodEntries([]);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@food_entries',
        JSON.stringify([])
      );
    });
  });

  describe('addDataChangeListener', () => {
    it('should register listener and return unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = addDataChangeListener(listener);

      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
    });

    it('should notify listeners when data changes', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      addDataChangeListener(listener1);
      addDataChangeListener(listener2);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const mockEntry: FoodEntry = {
        id: '1',
        name: 'Test Food',
        quantity: 100,
        unit: 'g',
        calories: 200,
        caloriesPer100: 200,
        timestamp: Date.now(),
        date: '2024-03-15',
      };

      await saveFoodEntry(mockEntry);

      // Wait for async operations (advance fake timers instead of real setTimeout)
      jest.advanceTimersByTime(10);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('generateTDEEDataHash', () => {
    it('should generate consistent hash for same data', () => {
      const profile: UserProfile = {
        id: '1',
        heightCm: 170,
        birthDate: '1990-01-01',
        sex: 'male',
        goal: 'maintain',
        goalRatePerWeek: 0,
        targetWeightLbs: 150,
      };

      const weightEntries: WeightEntry[] = [
        {
          id: '1',
          weight: 150,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
      ];

      const foodEntries: FoodEntry[] = [];
      const fastingDays: FastingDay[] = [];

      const hash1 = generateTDEEDataHash(
        profile,
        weightEntries,
        foodEntries,
        fastingDays
      );
      const hash2 = generateTDEEDataHash(
        profile,
        weightEntries,
        foodEntries,
        fastingDays
      );

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash when data changes', () => {
      const profile: UserProfile = {
        id: '1',
        heightCm: 170,
        birthDate: '1990-01-01',
        sex: 'male',
        goal: 'maintain',
        goalRatePerWeek: 0,
        targetWeightLbs: 150,
      };

      const weightEntries1: WeightEntry[] = [
        {
          id: '1',
          weight: 150,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
      ];

      const weightEntries2: WeightEntry[] = [
        {
          id: '1',
          weight: 151,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
      ];

      const foodEntries: FoodEntry[] = [];
      const fastingDays: FastingDay[] = [];

      const hash1 = generateTDEEDataHash(
        profile,
        weightEntries1,
        foodEntries,
        fastingDays
      );
      const hash2 = generateTDEEDataHash(
        profile,
        weightEntries2,
        foodEntries,
        fastingDays
      );

      expect(hash1).not.toBe(hash2);
    });

    it('should exclude today\'s entries from hash', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const profile: UserProfile = {
        id: '1',
        heightCm: 170,
        birthDate: '1990-01-01',
        sex: 'male',
        goal: 'maintain',
        goalRatePerWeek: 0,
        targetWeightLbs: 150,
      };

      const weightEntries: WeightEntry[] = [];

      const foodEntriesWithToday: FoodEntry[] = [
        {
          id: '1',
          name: 'Food',
          quantity: 100,
          unit: 'g',
          calories: 200,
          caloriesPer100: 200,
          timestamp: Date.now(),
          date: todayStr,
        },
      ];

      const foodEntriesWithoutToday: FoodEntry[] = [];
      const fastingDays: FastingDay[] = [];

      const hash1 = generateTDEEDataHash(
        profile,
        weightEntries,
        foodEntriesWithToday,
        fastingDays
      );
      const hash2 = generateTDEEDataHash(
        profile,
        weightEntries,
        foodEntriesWithoutToday,
        fastingDays
      );

      // Should be the same since today's food is excluded
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateWeightDataHash', () => {
    it('should generate consistent hash for same data', () => {
      const weightEntries: WeightEntry[] = [
        {
          id: '1',
          weight: 150,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
        {
          id: '2',
          weight: 151,
          date: '2024-03-16',
          timestamp: 1710604800000,
        },
      ];

      const hash1 = generateWeightDataHash(weightEntries);
      const hash2 = generateWeightDataHash(weightEntries);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash when data changes', () => {
      const weightEntries1: WeightEntry[] = [
        {
          id: '1',
          weight: 150,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
      ];

      const weightEntries2: WeightEntry[] = [
        {
          id: '1',
          weight: 150,
          date: '2024-03-15',
          timestamp: 1710518400000,
        },
        {
          id: '2',
          weight: 151,
          date: '2024-03-16',
          timestamp: 1710604800000,
        },
      ];

      const hash1 = generateWeightDataHash(weightEntries1);
      const hash2 = generateWeightDataHash(weightEntries2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty array', () => {
      const hash = generateWeightDataHash([]);

      expect(typeof hash).toBe('string');
      expect(hash).toContain('0|'); // Should have 0 entries
    });
  });
});
