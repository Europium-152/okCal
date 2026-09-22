import { parseMacroFactorWeightExcel } from '../excelParser';
import * as XLSX from 'xlsx';

// Mock XLSX module
jest.mock('xlsx');

describe('excelParser', () => {
  describe('parseMacroFactorWeightExcel', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should parse valid Excel file with weight data', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 68.0],
        ['2024-03-16', 67.8],
        ['2024-03-17', 67.5],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-03-15',
        weightKg: 68.0,
      });
      expect(result[1]).toEqual({
        date: '2024-03-16',
        weightKg: 67.8,
      });
      expect(result[2]).toEqual({
        date: '2024-03-17',
        weightKg: 67.5,
      });
    });

    it('should handle alternative column name "Weight"', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight'],
        ['2024-03-15', 68.0],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].weightKg).toBe(68.0);
    });

    it('should handle Excel date serial numbers', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        [45000, 68.0], // Excel date serial number
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
      (XLSX.SSF.parse_date_code as jest.Mock).mockReturnValue({
        y: 2024,
        m: 3,
        d: 15,
      });

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-15');
    });

    it('should skip rows with missing date', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        [null, 68.0],
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-16');
    });

    it('should skip rows with missing weight', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', null],
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-16');
    });

    it('should skip rows with invalid date format', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['03/15/2024', 68.0],
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-16');
    });

    it('should skip rows with invalid weight (non-numeric)', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 'invalid'],
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-16');
    });

    it('should skip rows with negative or zero weight', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-14', 0],
        ['2024-03-15', -5],
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-16');
    });

    it('should skip empty rows', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 68.0],
        [],
        null,
        ['2024-03-16', 67.8],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(2);
    });

    it('should throw error for empty file', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow('Excel file is empty');
    });

    it('should throw error for file with no sheets', () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {},
      };

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow('Excel file has no sheets');
    });

    it('should throw error for missing Date column', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Weight (kg)'],
        [68.0],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow('Missing required column: Date');
    });

    it('should throw error for missing Weight column', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date'],
        ['2024-03-15'],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow('Missing required column: Weight (kg)');
    });

    it('should use first sheet when multiple sheets exist', () => {
      const mockWorkbook = {
        SheetNames: ['Data', 'Summary', 'Notes'],
        Sheets: {
          Data: {},
          Summary: {},
          Notes: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 68.0],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(
        mockWorkbook.Sheets['Data'],
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should handle decimal weights', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 68.123],
        ['2024-03-16', 67.89],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result[0].weightKg).toBe(68.123);
      expect(result[1].weightKg).toBe(67.89);
    });

    it('should handle large weight values', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 250.5],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result[0].weightKg).toBe(250.5);
    });

    it('should handle case-insensitive column matching', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['date', 'weight (kg)'],
        ['2024-03-15', 68.0],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(1);
    });

    it('should handle weight strings that can be parsed to numbers', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', '68.0'],
        ['2024-03-16', '67.8'],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(2);
      expect(result[0].weightKg).toBe(68.0);
      expect(result[1].weightKg).toBe(67.8);
    });

    it('should return empty array when only headers present', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toEqual([]);
    });

    it('should handle Excel date conversion correctly', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        [44999, 68.0], // Different Excel serial
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
      (XLSX.SSF.parse_date_code as jest.Mock).mockReturnValue({
        y: 2024,
        m: 1,
        d: 5,
      });

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result[0].date).toBe('2024-01-05');
    });

    it('should pad single-digit months and days in date conversion', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        [44999, 68.0],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
      (XLSX.SSF.parse_date_code as jest.Mock).mockReturnValue({
        y: 2024,
        m: 3,
        d: 5,
      });

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result[0].date).toBe('2024-03-05');
    });

    it('should handle errors and rethrow them', () => {
      (XLSX.read as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid Excel file');
      });

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow('Invalid Excel file');
    });

    it('should handle corrupted workbook structure', () => {
      (XLSX.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: null,
      });

      const buffer = new ArrayBuffer(0);

      expect(() => parseMacroFactorWeightExcel(buffer)).toThrow();
    });

    it('should skip and continue when row parsing fails', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ['2024-03-15', 68.0],
        ['invalid-date-that-will-fail', 67.8],
        ['2024-03-17', 67.5],
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-03-15');
      expect(result[1].date).toBe('2024-03-17');
    });

    it('should handle very long date ranges', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      const mockData = [
        ['Date', 'Weight (kg)'],
        ...Array.from({ length: 365 }, (_, i) => [
          `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
          68.0 - i * 0.01,
        ]),
      ];

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const buffer = new ArrayBuffer(0);
      const result = parseMacroFactorWeightExcel(buffer);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(365);
    });
  });
});
