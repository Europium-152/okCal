import AsyncStorage from '@react-native-async-storage/async-storage';
import { importMacroFactorWeightLog } from '../weightImportService';
import { parseMacroFactorWeightExcel } from '@/utils/excelParser';

jest.mock('@/utils/excelParser', () => ({
  parseMacroFactorWeightExcel: jest.fn(),
}));

const existing = [
  { id: 'a', date: '2024-03-01', weight: 170, timestamp: 0 },
  { id: 'b', date: '2024-02-01', weight: 171, timestamp: 0 },
];

describe('importMacroFactorWeightLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseMacroFactorWeightExcel as jest.Mock).mockReturnValue([
      { date: '2024-03-01', weightKg: 80 },
      { date: '2024-03-02', weightKg: 81 },
    ]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));
  });

  it('reports overwritten entries as replaced, not skipped', async () => {
    const result = await importMacroFactorWeightLog(new ArrayBuffer(0), true);

    expect(result).toMatchObject({ success: true, entriesAdded: 2, entriesReplaced: 1, entriesSkipped: 0 });
    expect(result.datesAffected).toEqual(['2024-03-01', '2024-03-02']);
  });

  it('only counts dates that were actually imported when merging', async () => {
    const result = await importMacroFactorWeightLog(new ArrayBuffer(0), false);

    expect(result).toMatchObject({ success: true, entriesAdded: 1, entriesReplaced: 0, entriesSkipped: 1 });
    expect(result.datesAffected).toEqual(['2024-03-02']);
  });

  it('has no affected dates when everything is skipped', async () => {
    (parseMacroFactorWeightExcel as jest.Mock).mockReturnValue([{ date: '2024-03-01', weightKg: 80 }]);

    const result = await importMacroFactorWeightLog(new ArrayBuffer(0), false);

    expect(result).toMatchObject({ entriesAdded: 0, entriesSkipped: 1 });
    expect(result.datesAffected).toEqual([]);
  });
});
