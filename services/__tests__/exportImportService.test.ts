import { importLoggedWeight, importLoggedFood } from '../exportImportService';
import {
  getWeightEntries,
  getFoodEntries,
  saveWeightEntry,
  saveWeightEntries,
  saveFoodEntries,
  getAppSettings,
} from '@/utils/storage';

jest.mock('@/utils/storage', () => ({
  getWeightEntries: jest.fn(),
  getFoodEntries: jest.fn(),
  saveWeightEntry: jest.fn(),
  saveWeightEntries: jest.fn(),
  saveFoodEntry: jest.fn(),
  saveFoodEntries: jest.fn(),
  getAppSettings: jest.fn(),
}));

const weightCsv = 'Date,Weight (lbs)\n2024-03-01,180\n2024-03-02,181\n2024-03-03,182';
const foodCsv =
  'Date,Timestamp,Name,Quantity,Calories,Protein,Carbs,Fat\n' +
  '2024-03-01,2024-03-01T08:00:00Z,Oats,50,190,6.5,33,3.5\n' +
  '2024-03-01,2024-03-01T12:00:00Z,Rice,100,130,2.7,28,0.3\n' +
  '2024-03-02,2024-03-02T12:00:00Z,Rice,100,130,2.7,28,0.3';

const weight = (id: string, date: string) => ({ id, date, weight: 170, timestamp: 0 });
const food = (id: string, date: string) => ({
  id, date, name: 'Old', quantity: 100, unit: 'g' as const, calories: 1, caloriesPer100: 1, timestamp: 0,
});

describe('exportImportService import results', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAppSettings as jest.Mock).mockResolvedValue({});
  });

  describe('importLoggedWeight', () => {
    beforeEach(() => {
      (getWeightEntries as jest.Mock).mockResolvedValue([
        weight('a', '2024-03-01'),
        weight('b', '2024-03-02'),
        weight('c', '2024-02-01'),
      ]);
    });

    it('reports overwritten entries as replaced, not skipped', async () => {
      const result = await importLoggedWeight(weightCsv, true);

      expect(result).toMatchObject({ success: true, entriesAdded: 3, entriesReplaced: 2, entriesSkipped: 0 });
      const saved = (saveWeightEntries as jest.Mock).mock.calls[0][0];
      expect(saved.map((e: any) => e.date).sort()).toEqual([
        '2024-02-01', '2024-03-01', '2024-03-02', '2024-03-03',
      ]);
    });

    it('reports entries for existing dates as skipped when not overwriting', async () => {
      const result = await importLoggedWeight(weightCsv, false);

      expect(result).toMatchObject({ success: true, entriesAdded: 1, entriesReplaced: 0, entriesSkipped: 2 });
      expect(saveWeightEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe('importLoggedFood', () => {
    beforeEach(() => {
      (getFoodEntries as jest.Mock).mockResolvedValue([
        food('a', '2024-03-01'),
        food('b', '2024-03-01'),
        food('c', '2024-02-01'),
      ]);
    });

    it('reports overwritten entries as replaced, not skipped', async () => {
      const result = await importLoggedFood(foodCsv, true);

      expect(result).toMatchObject({ success: true, entriesAdded: 3, entriesReplaced: 2, entriesSkipped: 0 });
    });

    it('adds every entry without skipping when not overwriting', async () => {
      const result = await importLoggedFood(foodCsv, false);

      expect(result).toMatchObject({ success: true, entriesAdded: 3, entriesReplaced: 0, entriesSkipped: 0 });
      expect((saveFoodEntries as jest.Mock).mock.calls[0][0]).toHaveLength(6);
    });
  });
});
