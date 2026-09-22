/**
 * Import Service
 *
 * Handles importing food logs from various platforms
 */

import { FoodEntry } from '@/types';
import { MacroFactorRow, parseMacroFactorCSV } from '@/utils/csvParser';
import { getFoodEntries, saveFoodEntries } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDate } from '@/utils/dateHelpers';

export interface ImportResult {
  success: boolean;
  entriesAdded: number;
  entriesSkipped: number;
  datesAffected: string[];
  error?: string;
}

/**
 * Convert MacroFactor row to FoodEntry
 */
function macroFactorRowToFoodEntry(row: MacroFactorRow): FoodEntry {
  // Calculate total food weight in grams (Serving Qty × Serving Weight)
  const totalWeight = row.servingQty * row.servingWeight;

  // Calculate per-100g values using the formula: (Total × 100) / Total Weight
  const caloriesPer100g = totalWeight > 0 ? (row.calories * 100) / totalWeight : 0;
  const fatPer100g = totalWeight > 0 ? (row.fat * 100) / totalWeight : 0;
  const carbsPer100g = totalWeight > 0 ? (row.carbs * 100) / totalWeight : 0;
  const proteinPer100g = totalWeight > 0 ? (row.protein * 100) / totalWeight : 0;

  // Combine date and time into timestamp (milliseconds since epoch)
  const time24h = convertTo24Hour(row.time);
  const [hours, minutes] = time24h.split(':').map(Number);
  const dateObj = parseDate(row.date); // Use parseDate for local timezone
  dateObj.setHours(hours, minutes, 0, 0);
  const timestamp = dateObj.getTime();

  // Validate timestamp
  if (isNaN(timestamp)) {
    console.error(`Invalid timestamp generated from date=${row.date}, time=${row.time}`);
    throw new Error(`Invalid timestamp for date: ${row.date}, time: ${row.time}`);
  }

  return {
    id: generateId(),
    date: row.date,
    timestamp,
    name: row.foodName,
    quantity: Math.round(totalWeight * 10) / 10, // Actual consumed weight
    unit: 'g' as const,
    // Total values (directly from MacroFactor columns)
    calories: Math.round(row.calories),
    protein: Math.round(row.protein * 10) / 10,
    carbs: Math.round(row.carbs * 10) / 10,
    fat: Math.round(row.fat * 10) / 10,
    // Per-100g values (calculated)
    caloriesPer100: Math.round(caloriesPer100g),
    proteinPer100: Math.round(proteinPer100g * 10) / 10,
    carbsPer100: Math.round(carbsPer100g * 10) / 10,
    fatPer100: Math.round(fatPer100g * 10) / 10,
  };
}

/**
 * Convert 12-hour time (HH:MM AM/PM) to 24-hour time (HH:MM)
 */
function convertTo24Hour(time12h: string): string {
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!match) {
    // Fallback to noon if time format is invalid
    console.warn(`Invalid time format: ${time12h}, using 12:00`);
    return '12:00';
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const hoursStr = hours.toString().padStart(2, '0');
  return `${hoursStr}:${minutes}`;
}

/**
 * Generate unique ID for food entry
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Import MacroFactor food log CSV
 *
 * @param csvContent - Raw CSV file content
 * @param overwriteExisting - If true, clear existing entries for dates in the import
 * @returns Import result with statistics
 */
export async function importMacroFactorFoodLog(
  csvContent: string,
  overwriteExisting: boolean
): Promise<ImportResult> {
  try {
    // Parse CSV
    const rows = parseMacroFactorCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        entriesAdded: 0,
        entriesSkipped: 0,
        datesAffected: [],
        error: 'No valid entries found in CSV file',
      };
    }

    // Convert rows to food entries
    const newEntries = rows.map(macroFactorRowToFoodEntry);

    // Get unique dates in import
    const importDates = new Set(newEntries.map(e => e.date));
    const datesAffected = Array.from(importDates).sort();

    // This is critical for performance during large imports
    const data = await AsyncStorage.getItem('@food_entries');
    const existingEntries = data ? JSON.parse(data) : [];

    let finalEntries: FoodEntry[];

    if (overwriteExisting) {
      // Remove entries for dates in the import
      const filteredEntries = existingEntries.filter(e => !importDates.has(e.date));
      finalEntries = [...filteredEntries, ...newEntries];
    } else {
      // Keep all existing entries, add new ones
      finalEntries = [...existingEntries, ...newEntries];
    }

    // Sort by timestamp (numeric)
    finalEntries.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });

    // Save to local AsyncStorage first (fast, non-blocking)
    await AsyncStorage.setItem('@food_entries', JSON.stringify(finalEntries));

    return {
      success: true,
      entriesAdded: newEntries.length,
      entriesSkipped: 0,
      datesAffected,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      entriesAdded: 0,
      entriesSkipped: 0,
      datesAffected: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get preview of what would be imported (without actually importing)
 *
 * @param csvContent - Raw CSV file content
 * @returns Preview information
 */
export async function previewMacroFactorImport(csvContent: string): Promise<{
  totalEntries: number;
  dateRange: { start: string; end: string } | null;
  datesAffected: string[];
  conflictingDates: string[];
}> {
  try {
    const rows = parseMacroFactorCSV(csvContent);
    const newEntries = rows.map(macroFactorRowToFoodEntry);

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
    // OPTIMIZED: Skip cloud fetch during preview (read from local cache only)
    const existingEntries = await getFoodEntries();
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
