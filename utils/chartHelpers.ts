/**
 * Chart Helper Utilities
 *
 * Functions to improve chart rendering and user experience
 */

/**
 * Generate unique y-axis tick values to avoid repeated labels
 *
 * @param min - Minimum value in the dataset
 * @param max - Maximum value in the dataset
 * @param maxTicks - Maximum number of ticks to show (default 5)
 * @param precision - Number of decimal places for uniqueness check (default 0)
 * @returns Array of unique tick values
 */
export function generateUniqueTicks(min: number, max: number, maxTicks: number = 5, precision: number = 0): number[] {
  if (min === max) {
    return [min];
  }

  const range = max - min;

  // Try different step sizes to find one that gives unique labels
  // For weight charts with decimal precision, include smaller steps
  const preferredSteps = precision > 0
    ? [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
    : [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

  for (const step of preferredSteps) {
    const startTick = Math.floor(min / step) * step;
    const ticks: number[] = [];

    for (let tick = startTick; tick <= max; tick += step) {
      if (tick >= min) {
        ticks.push(tick);
      }
    }

    // Check if we have unique labels when rounded to specified precision
    const labels = ticks.map(t => Number(t.toFixed(precision)));
    const uniqueLabels = new Set(labels);

    if (uniqueLabels.size === labels.length && ticks.length <= maxTicks && ticks.length >= 2) {
      return ticks;
    }
  }

  // Fallback: use min and max only
  return [Math.floor(min), Math.ceil(max)];
}

/**
 * Format large numbers for y-axis labels (e.g., 1000 -> "1k")
 */
export function formatYAxisLabel(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

/**
 * Get date range filter based on selected period
 *
 * @param entries - Array of date strings or objects with date property
 * @param range - Selected range ("2W", "1M", "6M", "1Y", "All")
 * @returns Start date for filtering
 */
export function getStartDateForRange(range: '2W' | '1M' | '6M' | '1Y' | 'All', allDates: string[]): Date | null {
  if (range === 'All' || allDates.length === 0) {
    return null; // No filtering
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysBack: number;
  switch (range) {
    case '2W':
      daysBack = 14;
      break;
    case '1M':
      daysBack = 30;
      break;
    case '6M':
      daysBack = 180;
      break;
    case '1Y':
      daysBack = 365;
      break;
    default:
      return null;
  }

  const calculatedStart = new Date(today);
  calculatedStart.setDate(calculatedStart.getDate() - daysBack);

  // Cap at earliest available date
  const earliestDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));

  return calculatedStart > earliestDate ? calculatedStart : earliestDate;
}
