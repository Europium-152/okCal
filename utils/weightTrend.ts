/**
 * Weight Trend Calculation using Exponentially Weighted Moving Average (EWMA)
 *
 * This module implements weight trend smoothing to filter out daily fluctuations
 * caused by water retention, gut contents, and other transient factors.
 *
 * Based on The Hacker's Diet and MacroFactor approaches.
 */

import { WeightEntry } from '@/types';
import { formatDate, parseDate } from './dateHelpers';
import {
  EWMA_SMOOTHING_FACTOR,
  HYBRID_EDGE_DAYS,
  HYBRID_WINDOW_DAYS
} from '@/constants/nutrition';

export interface TrendEntry {
  date: string;        // ISO format: "YYYY-MM-DD"
  weight: number;      // Original measurement in lbs
  trend: number;       // Smoothed trend value in lbs
}

/**
 * Calculate weight trend using EWMA only (causal filter)
 * PRESERVED FOR POTENTIAL ROLLBACK
 *
 * @param weights - Array of weight entries (in lbs)
 * @returns Array of trend entries with both scale weight and trend weight
 */
export function calculateWeightTrendEWMA(weights: WeightEntry[]): TrendEntry[] {
  if (weights.length === 0) return [];

  // Sort chronologically
  const sorted = [...weights].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  // Group by date and calculate daily averages (handle multiple entries per day)
  const dailyAverages = aggregateByDate(sorted);

  // Fill gaps with linear interpolation
  const filled = interpolateMissingDays(dailyAverages);

  // Apply EWMA
  const result: TrendEntry[] = [];
  let trend = filled[0].weight;

  for (const entry of filled) {
    trend = EWMA_SMOOTHING_FACTOR * entry.weight + (1 - EWMA_SMOOTHING_FACTOR) * trend;
    result.push({
      date: entry.date,
      weight: entry.weight,
      trend: Math.round(trend * 100) / 100, // Round to 2 decimal places
    });
  }

  return result;
}

/**
 * Aggregate multiple weight entries on the same date into daily averages
 */
function aggregateByDate(weights: WeightEntry[]): Array<{ date: string; weight: number }> {
  const weightsByDate = new Map<string, number[]>();

  weights.forEach(entry => {
    const existing = weightsByDate.get(entry.date) || [];
    existing.push(entry.weight);
    weightsByDate.set(entry.date, existing);
  });

  return Array.from(weightsByDate.entries())
    .map(([date, weights]) => ({
      date,
      weight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
    }))
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
}

/**
 * Fill missing days with linear interpolation
 *
 * This prevents the trend from "jumping" when the user returns after skipping days.
 */
function interpolateMissingDays(
  weights: Array<{ date: string; weight: number }>
): Array<{ date: string; weight: number }> {
  if (weights.length < 2) return weights;

  const result: Array<{ date: string; weight: number }> = [];

  for (let i = 0; i < weights.length; i++) {
    result.push(weights[i]);

    if (i < weights.length - 1) {
      const currentDate = parseDate(weights[i].date);
      const nextDate = parseDate(weights[i + 1].date);
      const daysDiff = Math.round(
        (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Fill gaps with linear interpolation
      if (daysDiff > 1) {
        const weightDiff = weights[i + 1].weight - weights[i].weight;
        const dailyChange = weightDiff / daysDiff;

        for (let d = 1; d < daysDiff; d++) {
          const interpDate = new Date(currentDate);
          interpDate.setDate(interpDate.getDate() + d);
          result.push({
            date: formatDate(interpDate),
            weight: weights[i].weight + dailyChange * d,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Get the most recent trend weight
 */
export function getLatestTrendWeight(weights: WeightEntry[]): number | null {
  const trends = calculateWeightTrend(weights);
  if (trends.length === 0) return null;
  return trends[trends.length - 1].trend;
}

/**
 * Get trend weight for a specific date
 */
export function getTrendWeightForDate(weights: WeightEntry[], date: string): number | null {
  const trends = calculateWeightTrend(weights);
  const entry = trends.find(t => t.date === date);
  return entry ? entry.trend : null;
}

/**
 * Calculate weight trend using hybrid filter (EWMA + Centered Average)
 *
 * This hybrid approach combines:
 * - EWMA (causal filter) for the first HYBRID_EDGE_DAYS days (not enough future data)
 * - EWMA (causal filter) for the last HYBRID_EDGE_DAYS days (current data, can't use future)
 * - Centered moving average (non-causal filter) for middle days (benefit of hindsight)
 *
 * @param weights - Array of weight entries (in lbs)
 * @returns Array of trend entries with both scale weight and trend weight
 */
export function calculateWeightTrendHybrid(weights: WeightEntry[]): TrendEntry[] {
  if (weights.length === 0) return [];

  // Sort chronologically
  const sorted = [...weights].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  // Group by date and calculate daily averages (handle multiple entries per day)
  const dailyAverages = aggregateByDate(sorted);

  // Fill gaps with linear interpolation
  const filled = interpolateMissingDays(dailyAverages);

  const result: TrendEntry[] = [];
  const n = filled.length;

  // If dataset is too small, fall back to EWMA only
  if (n <= HYBRID_EDGE_DAYS * 2) {
    return calculateWeightTrendEWMA(weights);
  }

  // First pass: Calculate EWMA for first HYBRID_EDGE_DAYS
  let ewmaTrend = filled[0].weight;

  for (let i = 0; i < HYBRID_EDGE_DAYS; i++) {
    ewmaTrend = EWMA_SMOOTHING_FACTOR * filled[i].weight + (1 - EWMA_SMOOTHING_FACTOR) * ewmaTrend;
    result.push({
      date: filled[i].date,
      weight: filled[i].weight,
      trend: Math.round(ewmaTrend * 100) / 100,
    });
  }

  // Second pass: Calculate centered moving average for middle days
  for (let i = HYBRID_EDGE_DAYS; i < n - HYBRID_EDGE_DAYS; i++) {
    const startIdx = Math.max(0, i - HYBRID_WINDOW_DAYS);
    const endIdx = Math.min(n - 1, i + HYBRID_WINDOW_DAYS);

    let sum = 0;
    let count = 0;

    for (let j = startIdx; j <= endIdx; j++) {
      sum += filled[j].weight;
      count++;
    }

    const trendValue = sum / count;
    result.push({
      date: filled[i].date,
      weight: filled[i].weight,
      trend: Math.round(trendValue * 100) / 100,
    });
  }

  // Third pass: Calculate EWMA for last HYBRID_EDGE_DAYS, starting from last averaged value
  // Initialize EWMA with the last trend value from the middle section
  ewmaTrend = result[result.length - 1].trend;

  for (let i = n - HYBRID_EDGE_DAYS; i < n; i++) {
    ewmaTrend = EWMA_SMOOTHING_FACTOR * filled[i].weight + (1 - EWMA_SMOOTHING_FACTOR) * ewmaTrend;
    result.push({
      date: filled[i].date,
      weight: filled[i].weight,
      trend: Math.round(ewmaTrend * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate weight trend using the active algorithm
 * Currently uses hybrid filter
 */
export function calculateWeightTrend(weights: WeightEntry[]): TrendEntry[] {
  return calculateWeightTrendHybrid(weights);
}
