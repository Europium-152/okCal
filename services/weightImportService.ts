/**
 * Weight Import Service
 *
 * Handles importing weight logs from various platforms
 */

import { WeightEntry } from '@/types';
import { MacroFactorWeightRow, parseMacroFactorWeightExcel } from '@/utils/excelParser';
import { getWeightEntries, saveWeightEntry, saveWeightEntries } from '@/utils/storage';
import { lbsFromKg } from '@/constants/nutrition';
import { parseDate } from '@/utils/dateHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeightImportResult {
  success: boolean;
  entriesAdded: number;
  /** Existing entries removed and replaced by imported ones (overwrite mode) */
  entriesReplaced: number;
  /** Imported entries not written because the date already had a weight (merge mode) */
  entriesSkipped: number;
  /** Dates whose data actually changed */
  datesAffected: string[];
  error?: string;
}

/**
 * Convert MacroFactor weight row to WeightEntry
 */
function macroFactorWeightRowToEntry(row: MacroFactorWeightRow): WeightEntry {
  // Convert kg to lbs (internal storage is in lbs)
  const weightLbs = lbsFromKg(row.weightKg);

  // Create timestamp at noon on the date (use parseDate for local timezone)
  const date = parseDate(row.date);
  date.setHours(12, 0, 0, 0);

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    date: row.date,
    weight: weightLbs,
    timestamp: date.getTime(),
  };
}

/**
 * Import MacroFactor weight Excel file
 *
 * @param fileContent - Excel file content as ArrayBuffer
 * @param overwriteExisting - If true, replace existing entries for dates in the import
 * @returns Import result with statistics
 */
export async function importMacroFactorWeightLog(
  fileContent: ArrayBuffer,
  overwriteExisting: boolean
): Promise<WeightImportResult> {
  try {
    // Parse Excel
    const rows = parseMacroFactorWeightExcel(fileContent);

    if (rows.length === 0) {
      return {
        success: false,
        entriesAdded: 0,
        entriesReplaced: 0,
        entriesSkipped: 0,
        datesAffected: [],
        error: 'No valid weight entries found in Excel file',
      };
    }

    // Convert rows to weight entries
    const newEntries = rows.map(macroFactorWeightRowToEntry);

    const data = await AsyncStorage.getItem('@weight_entries');
    const existingEntries = data ? JSON.parse(data) : [];

    // Determine final entries and stats
    let finalEntries: WeightEntry[];
    let writtenEntries: WeightEntry[];
    let entriesReplaced = 0;
    let entriesSkipped = 0;

    if (overwriteExisting) {
      // Remove existing entries for dates in the import
      const importDates = new Set(newEntries.map(e => e.date));
      const filteredEntries = existingEntries.filter(e => !importDates.has(e.date));
      entriesReplaced = existingEntries.length - filteredEntries.length;

      // Combine filtered existing entries with new entries
      finalEntries = [...filteredEntries, ...newEntries];
      writtenEntries = newEntries;
    } else {
      // Skip entries for dates that already exist
      const existingDates = new Set(existingEntries.map(e => e.date));
      writtenEntries = newEntries.filter(e => !existingDates.has(e.date));
      entriesSkipped = newEntries.length - writtenEntries.length;

      // Combine all existing entries with new non-duplicate entries
      finalEntries = [...existingEntries, ...writtenEntries];
    }

    const datesAffected = Array.from(new Set(writtenEntries.map(e => e.date))).sort();
    const entriesAdded = writtenEntries.length;

    // Save to local AsyncStorage first (fast, non-blocking)
    await AsyncStorage.setItem('@weight_entries', JSON.stringify(finalEntries));

    return {
      success: true,
      entriesAdded,
      entriesReplaced,
      entriesSkipped,
      datesAffected,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      entriesAdded: 0,
      entriesReplaced: 0,
      entriesSkipped: 0,
      datesAffected: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get preview of what would be imported (without actually importing)
 *
 * @param fileContent - Excel file content as ArrayBuffer
 * @returns Preview information
 */
export async function previewMacroFactorWeightImport(fileContent: ArrayBuffer): Promise<{
  totalEntries: number;
  dateRange: { start: string; end: string } | null;
  datesAffected: string[];
  conflictingDates: string[];
}> {
  try {
    const rows = parseMacroFactorWeightExcel(fileContent);
    const newEntries = rows.map(macroFactorWeightRowToEntry);

    if (newEntries.length === 0) {
      return {
        totalEntries: 0,
        dateRange: null,
        datesAffected: [],
        conflictingDates: [],
      };
    }

    const dates = newEntries.map(e => e.date).sort();
    const uniqueDates = Array.from(new Set(dates));

    // Check for conflicts with existing data
    const existingEntries = await getWeightEntries();
    const existingDates = new Set(existingEntries.map(e => e.date));
    const conflictingDates = uniqueDates.filter(d => existingDates.has(d));

    return {
      totalEntries: newEntries.length,
      dateRange: {
        start: dates[0],
        end: dates[dates.length - 1],
      },
      datesAffected: uniqueDates,
      conflictingDates,
    };
  } catch (error) {
    console.error('Preview error:', error);
    return {
      totalEntries: 0,
      dateRange: null,
      datesAffected: [],
      conflictingDates: [],
    };
  }
}
