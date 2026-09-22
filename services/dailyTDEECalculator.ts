/**
 * Daily TDEE Calculation
 *
 * Calculate TDEE for each historical date using the same methodology
 * as the current TDEE estimation, but applied to each date in the dataset.
 */

import { UserProfile, WeightEntry, FoodEntry, FastingDay } from '@/types';
import { TDEECalculator } from './TDEECalculator';
import { formatDate, addDays, parseDate } from '@/utils/dateHelpers';
import { InteractionManager } from 'react-native';

export interface DailyTDEEEntry {
  date: string;  // ISO format
  tdee: number;  // Estimated TDEE for this date
}

/**
 * Calculate TDEE for each day in the date range
 *
 * For each date, uses the preceding 14 days of calorie logs
 * and 14 days of weight logs (offset by +1 day) to estimate TDEE.
 *
 * @param profile - User profile with height, age, sex, activity level
 * @param weightEntries - All weight entries
 * @param foodEntries - All food entries
 * @param fastingDays - All fasting days
 * @param startDate - First date to calculate TDEE for (ISO string)
 * @param endDate - Last date to calculate TDEE for (ISO string, exclusive of today)
 * @returns Array of daily TDEE estimates
 */
export function calculateDailyTDEE(
  profile: UserProfile | null,
  weightEntries: WeightEntry[],
  foodEntries: FoodEntry[],
  fastingDays: FastingDay[],
  startDate: string,
  endDate: string
): DailyTDEEEntry[] {
  if (!profile) return [];

  const results: DailyTDEEEntry[] = [];
  const start = parseDate(startDate); // Use parseDate for local timezone
  const end = parseDate(endDate); // Use parseDate for local timezone

  // Iterate through each date
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = formatDate(currentDate);

    // Get data available up to (but not including) this date for calories
    // and up to (and including) this date for weights
    const availableWeights = weightEntries.filter(w => parseDate(w.date) <= currentDate);
    const availableFoods = foodEntries.filter(f => parseDate(f.date) < currentDate);
    const availableFasting = fastingDays.filter(f => parseDate(f.date) < currentDate);

    // Check if we have sufficient data:
    // - At least 3 weight entries
    // - At least 7 unique days with calorie data (food entries OR fasting days)
    const uniqueWeightDays = new Set(availableWeights.map(w => w.date)).size;
    const uniqueCalorieDays = new Set([
      ...availableFoods.map(f => f.date),
      ...availableFasting.map(f => f.date)
    ]).size;

    if (uniqueWeightDays >= 3 && uniqueCalorieDays >= 7) {
      const calculator = new TDEECalculator(
        profile,
        availableWeights,
        availableFoods,
        availableFasting,
        currentDate  // Pass current date as reference date for historical calculation
      );

      const estimate = calculator.calculateTDEEEstimate();
      if (estimate && estimate.blendedTdee > 0) {
        results.push({
          date: dateStr,
          tdee: estimate.blendedTdee,
        });
      }
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  return results;
}

/**
 * Calculate TDEE for each day in the date range (async, non-blocking version)
 *
 * This version processes dates in chunks with breaks in between to keep the UI responsive.
 * It yields control back to the UI thread periodically so animations and user interactions
 * remain smooth even during long calculations.
 *
 * @param profile - User profile
 * @param weightEntries - All weight entries
 * @param foodEntries - All food entries
 * @param fastingDays - All fasting days
 * @param startDate - First date to calculate
 * @param endDate - Last date to calculate
 * @param onProgress - Optional callback for progress updates (current day index, total days)
 * @returns Promise resolving to array of daily TDEE estimates
 */
export async function calculateDailyTDEEAsync(
  profile: UserProfile | null,
  weightEntries: WeightEntry[],
  foodEntries: FoodEntry[],
  fastingDays: FastingDay[],
  startDate: string,
  endDate: string,
  onProgress?: (current: number, total: number) => void,
  shouldCancel?: () => boolean
): Promise<DailyTDEEEntry[]> {
  if (!profile) return [];

  const results: DailyTDEEEntry[] = [];
  const start = parseDate(startDate); // Use parseDate for local timezone
  const end = parseDate(endDate); // Use parseDate for local timezone

  // Calculate total number of days
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Process in chunks of 10 days to keep UI responsive
  const CHUNK_SIZE = 10;
  let currentDate = new Date(start);
  let dayIndex = 0;

  while (currentDate <= end) {
    // Process a chunk of days
    for (let i = 0; i < CHUNK_SIZE && currentDate <= end; i++) {
      const dateStr = formatDate(currentDate);

      // Get data available up to (but not including) this date for calories
      // and up to (and including) this date for weights
      const availableWeights = weightEntries.filter(w => parseDate(w.date) <= currentDate);
      const availableFoods = foodEntries.filter(f => parseDate(f.date) < currentDate);
      const availableFasting = fastingDays.filter(f => parseDate(f.date) < currentDate);

      // Check if we have sufficient data
      const uniqueWeightDays = new Set(availableWeights.map(w => w.date)).size;
      const uniqueCalorieDays = new Set([
        ...availableFoods.map(f => f.date),
        ...availableFasting.map(f => f.date)
      ]).size;

      if (uniqueWeightDays >= 3 && uniqueCalorieDays >= 7) {
        const calculator = new TDEECalculator(
          profile,
          availableWeights,
          availableFoods,
          availableFasting,
          currentDate
        );

        const estimate = calculator.calculateTDEEEstimate();
        if (estimate && estimate.blendedTdee > 0) {
          results.push({
            date: dateStr,
            tdee: estimate.blendedTdee,
          });
        }
      }

      // Move to next day
      currentDate = addDays(currentDate, 1);
      dayIndex++;

      // Report progress
      if (onProgress) {
        onProgress(dayIndex, totalDays);
      }
    }

    // Yield to UI thread after processing each chunk
    // This allows React to render updates and keeps the app responsive
    await new Promise(resolve => setTimeout(resolve, 0));

    // Check if calculation should be cancelled
    if (shouldCancel && shouldCancel()) {
      console.log(`[TDEE CALC] Calculation cancelled at day ${dayIndex}/${totalDays}`);
      return []; // Return empty array to indicate cancellation
    }
  }

  return results;
}
