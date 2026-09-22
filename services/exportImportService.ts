/**
 * Export/Import Service
 *
 * Handles exporting and importing app data as CSV files
 */

import { WeightEntry, FoodEntry, AppSettings } from '@/types';
import { getWeightEntries, getFoodEntries, saveWeightEntry, saveFoodEntry, getAppSettings, saveWeightEntries, saveFoodEntries } from '@/utils/storage';
import { calculateWeightTrend, TrendEntry } from '@/utils/weightTrend';
import { kgFromLbs } from '@/constants/nutrition';
import { parseDate } from '@/utils/dateHelpers';

export type ExportDataset = 'logged_weight' | 'trend_weight' | 'calorie_macros' | 'logged_food';

export interface ExportResult {
  success: boolean;
  csvContent?: string;
  filename: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  entriesAdded: number;
  entriesSkipped: number;
  error?: string;
}

/**
 * Convert weight from lbs to user's preferred units
 */
function convertWeight(weightLbs: number, units: 'metric' | 'imperial'): number {
  if (units === 'metric') {
    return Math.round(kgFromLbs(weightLbs) * 100) / 100; // Round to 2 decimals
  }
  return Math.round(weightLbs * 100) / 100; // Round to 2 decimals
}

/**
 * Convert weight from user's preferred units to lbs (internal storage)
 */
function convertWeightToLbs(weight: number, units: 'metric' | 'imperial'): number {
  if (units === 'metric') {
    // Convert kg to lbs
    return weight * 2.20462;
  }
  return weight;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Export Logged Weight
 */
export async function exportLoggedWeight(): Promise<ExportResult> {
  try {
    const settings = await getAppSettings();
    const entries = await getWeightEntries();

    if (entries.length === 0) {
      return {
        success: false,
        filename: '',
        error: 'No weight entries to export',
      };
    }

    // Sort by date
    const sorted = [...entries].sort((a, b) =>
      parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );

    // Create CSV
    const unitLabel = settings.units === 'metric' ? 'kg' : 'lbs';
    const header = `Date,Weight (${unitLabel})`;
    const rows = sorted.map(entry => {
      const weight = convertWeight(entry.weight, settings.units);
      return `${entry.date},${weight}`;
    });

    const csvContent = [header, ...rows].join('\n');
    const filename = `logged_weight_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (error) {
    console.error('Export logged weight error:', error);
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export Trend Weight
 */
export async function exportTrendWeight(): Promise<ExportResult> {
  try {
    const settings = await getAppSettings();
    const entries = await getWeightEntries();

    if (entries.length === 0) {
      return {
        success: false,
        filename: '',
        error: 'No weight entries to calculate trend',
      };
    }

    // Calculate trend
    const trendEntries = calculateWeightTrend(entries);

    // Create CSV
    const unitLabel = settings.units === 'metric' ? 'kg' : 'lbs';
    const header = `Date,Trend Weight (${unitLabel})`;
    const rows = trendEntries.map(entry => {
      const trend = convertWeight(entry.trend, settings.units);
      return `${entry.date},${trend}`;
    });

    const csvContent = [header, ...rows].join('\n');
    const filename = `trend_weight_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (error) {
    console.error('Export trend weight error:', error);
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export Calorie and Macro Intake
 */
export async function exportCalorieMacros(): Promise<ExportResult> {
  try {
    const entries = await getFoodEntries();

    if (entries.length === 0) {
      return {
        success: false,
        filename: '',
        error: 'No food entries to export',
      };
    }

    // Group by date and calculate totals
    const dailyTotals = new Map<string, {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>();

    entries.forEach(entry => {
      const existing = dailyTotals.get(entry.date) || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      existing.calories += entry.calories;
      existing.protein += entry.protein || 0;
      existing.carbs += entry.carbs || 0;
      existing.fat += entry.fat || 0;

      dailyTotals.set(entry.date, existing);
    });

    // Sort by date
    const sorted = Array.from(dailyTotals.entries()).sort((a, b) =>
      parseDate(a[0]).getTime() - parseDate(b[0]).getTime()
    );

    // Create CSV
    const header = 'Date,Calories (kcal),Protein (g),Carbs (g),Fat (g)';
    const rows = sorted.map(([date, totals]) => {
      const calories = Math.round(totals.calories);
      const protein = Math.round(totals.protein * 10) / 10;
      const carbs = Math.round(totals.carbs * 10) / 10;
      const fat = Math.round(totals.fat * 10) / 10;
      return `${date},${calories},${protein},${carbs},${fat}`;
    });

    const csvContent = [header, ...rows].join('\n');
    const filename = `calorie_macros_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (error) {
    console.error('Export calorie/macros error:', error);
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export Logged Food
 */
export async function exportLoggedFood(): Promise<ExportResult> {
  try {
    const entries = await getFoodEntries();

    if (entries.length === 0) {
      return {
        success: false,
        filename: '',
        error: 'No food entries to export',
      };
    }

    // Sort by timestamp
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    // Create CSV
    const header = 'Date,Timestamp,Food Name,Total Weight (g),Calories (kcal),Protein (g),Carbs (g),Fat (g)';
    const rows = sorted.map(entry => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const calories = Math.round(entry.calories);
      const protein = Math.round((entry.protein || 0) * 10) / 10;
      const carbs = Math.round((entry.carbs || 0) * 10) / 10;
      const fat = Math.round((entry.fat || 0) * 10) / 10;

      return `${entry.date},${timestamp},${escapeCSV(entry.name)},${entry.quantity},${calories},${protein},${carbs},${fat}`;
    });

    const csvContent = [header, ...rows].join('\n');
    const filename = `logged_food_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (error) {
    console.error('Export logged food error:', error);
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import Logged Weight from CSV
 */
export async function importLoggedWeight(csvContent: string, overwrite: boolean = false): Promise<ImportResult> {
  try {
    const lines = csvContent.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        entriesAdded: 0,
        entriesSkipped: 0,
        error: 'CSV file is empty or invalid',
      };
    }

    // Parse header to determine units
    const header = lines[0].toLowerCase();
    const isMetric = header.includes('kg');
    const settings = await getAppSettings();
    const units = isMetric ? 'metric' : 'imperial';

    // Parse data rows
    const newEntries: WeightEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;

      const date = fields[0].trim();
      const weight = parseFloat(fields[1]);

      if (!date || isNaN(weight)) continue;

      // Convert to lbs (internal storage)
      const weightLbs = convertWeightToLbs(weight, units);

      // Create timestamp at noon using local timezone
      const dateObj = parseDate(date);
      dateObj.setHours(12, 0, 0, 0);

      newEntries.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        date,
        weight: weightLbs,
        timestamp: dateObj.getTime(),
      });
    }

    if (newEntries.length === 0) {
      return {
        success: false,
        entriesAdded: 0,
        entriesSkipped: 0,
        error: 'No valid entries found in CSV',
      };
    }

    // Handle existing entries
    const existingEntries = await getWeightEntries();
    let entriesToAdd: WeightEntry[];
    let entriesSkipped = 0;

    if (overwrite) {
      // Remove existing entries for dates in import
      const importDates = new Set(newEntries.map(e => e.date));
      const filtered = existingEntries.filter(e => !importDates.has(e.date));
      entriesSkipped = existingEntries.length - filtered.length;

      // Save all entries (filtered + new)
      await saveWeightEntries([...filtered, ...newEntries]);
      entriesToAdd = newEntries;
    } else {
      // Skip entries for dates that already exist
      const existingDates = new Set(existingEntries.map(e => e.date));
      entriesToAdd = newEntries.filter(e => !existingDates.has(e.date));
      entriesSkipped = newEntries.length - entriesToAdd.length;

      // Save only new entries
      for (const entry of entriesToAdd) {
        await saveWeightEntry(entry);
      }
    }

    return {
      success: true,
      entriesAdded: entriesToAdd.length,
      entriesSkipped,
    };
  } catch (error) {
    console.error('Import logged weight error:', error);
    return {
      success: false,
      entriesAdded: 0,
      entriesSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import Logged Food from CSV
 */
export async function importLoggedFood(csvContent: string, overwrite: boolean = false): Promise<ImportResult> {
  try {
    const lines = csvContent.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        entriesAdded: 0,
        entriesSkipped: 0,
        error: 'CSV file is empty or invalid',
      };
    }

    // Parse data rows (skip header)
    const newEntries: FoodEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 8) continue;

      const date = fields[0].trim();
      const timestamp = new Date(fields[1].trim()).getTime();
      const name = fields[2].trim();
      const quantity = parseFloat(fields[3]);
      const calories = parseFloat(fields[4]);
      const protein = parseFloat(fields[5]);
      const carbs = parseFloat(fields[6]);
      const fat = parseFloat(fields[7]);

      if (!date || !name || isNaN(quantity) || isNaN(calories)) continue;

      // Calculate per-100g values
      const caloriesPer100 = (calories / quantity) * 100;
      const proteinPer100 = isNaN(protein) ? 0 : (protein / quantity) * 100;
      const carbsPer100 = isNaN(carbs) ? 0 : (carbs / quantity) * 100;
      const fatPer100 = isNaN(fat) ? 0 : (fat / quantity) * 100;

      newEntries.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        date,
        name,
        calories: Math.round(calories),
        protein: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
        carbs: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
        fat: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
        quantity,
        unit: 'g',
        caloriesPer100,
        proteinPer100,
        carbsPer100,
        fatPer100,
        timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      });
    }

    if (newEntries.length === 0) {
      return {
        success: false,
        entriesAdded: 0,
        entriesSkipped: 0,
        error: 'No valid entries found in CSV',
      };
    }

    // Handle existing entries
    const existingEntries = await getFoodEntries();
    let entriesToAdd: FoodEntry[];
    let entriesSkipped = 0;

    if (overwrite) {
      // Remove existing entries for dates in import
      const importDates = new Set(newEntries.map(e => e.date));
      const filtered = existingEntries.filter(e => !importDates.has(e.date));
      entriesSkipped = existingEntries.length - filtered.length;

      // Save all entries (filtered + new) - bulk save
      await saveFoodEntries([...filtered, ...newEntries]);
      entriesToAdd = newEntries;
    } else {
      // Add all new entries (don't skip duplicates since food can be logged multiple times)
      entriesToAdd = newEntries;

      // FIXED: Use bulk save instead of sequential saves
      // This is much faster for large imports (avoids N sequential AsyncStorage operations)
      await saveFoodEntries([...existingEntries, ...entriesToAdd]);
    }

    return {
      success: true,
      entriesAdded: entriesToAdd.length,
      entriesSkipped,
    };
  } catch (error) {
    console.error('Import logged food error:', error);
    return {
      success: false,
      entriesAdded: 0,
      entriesSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
