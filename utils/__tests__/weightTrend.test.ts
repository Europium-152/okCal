import {
  calculateWeightTrend,
  calculateWeightTrendEWMA,
  calculateWeightTrendHybrid,
  getLatestTrendWeight,
  getTrendWeightForDate,
} from '../weightTrend';
import { WeightEntry } from '@/types';

describe('weightTrend', () => {
  describe('calculateWeightTrendEWMA', () => {
    it('should return empty array for no data', () => {
      const result = calculateWeightTrendEWMA([]);
      expect(result).toEqual([]);
    });

    it('should handle single data point', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2024-03-15',
        weight: 150,
        trend: 150,
      });
    });

    it('should calculate EWMA for multiple consecutive days', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-03-15');
      expect(result[1].date).toBe('2024-03-16');
      expect(result[2].date).toBe('2024-03-17');

      // First trend should equal first weight
      expect(result[0].trend).toBe(150);

      // Subsequent trends should be smoothed
      // trend = α * weight + (1 - α) * prev_trend (α = 0.1)
      expect(result[1].trend).toBeCloseTo(150.1, 1); // 0.1 * 151 + 0.9 * 150
      expect(result[2].trend).toBeCloseTo(150.29, 1); // 0.1 * 152 + 0.9 * 150.1
    });

    it('should round trend to 2 decimal places', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150.123, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 150.456, date: '2024-03-16', timestamp: 1710604800000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result[0].trend).toBe(150.12);
      expect(result[1].trend).toBeCloseTo(150.16, 2);
    });

    it('should aggregate multiple entries on same date', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 149, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-15', timestamp: 1710518500000 },
        { id: '3', weight: 152, date: '2024-03-16', timestamp: 1710604800000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      // Should average 149 and 151 for 2024-03-15
      expect(result[0].weight).toBe(150);
      expect(result[0].date).toBe('2024-03-15');
      expect(result[1].weight).toBe(152);
      expect(result[1].date).toBe('2024-03-16');
    });

    it('should interpolate missing days', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 153, date: '2024-03-18', timestamp: 1710777600000 }, // 3 days later
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result).toHaveLength(4); // Original 2 + 2 interpolated
      expect(result[0].date).toBe('2024-03-15');
      expect(result[0].weight).toBe(150);
      expect(result[1].date).toBe('2024-03-16');
      expect(result[1].weight).toBe(151); // Linear interpolation
      expect(result[2].date).toBe('2024-03-17');
      expect(result[2].weight).toBe(152);
      expect(result[3].date).toBe('2024-03-18');
      expect(result[3].weight).toBe(153);
    });

    it('should handle unsorted input', () => {
      const weights: WeightEntry[] = [
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result[0].date).toBe('2024-03-15');
      expect(result[1].date).toBe('2024-03-16');
      expect(result[2].date).toBe('2024-03-17');
    });

    it('should handle weight loss (decreasing trend)', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 149, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 148, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result[0].trend).toBe(150);
      expect(result[1].trend).toBeLessThan(150);
      expect(result[2].trend).toBeLessThan(result[1].trend);
    });

    it('should handle weight gain (increasing trend)', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      expect(result[0].trend).toBe(150);
      expect(result[1].trend).toBeGreaterThan(150);
      expect(result[2].trend).toBeGreaterThan(result[1].trend);
    });

    it('should handle fluctuating weights', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 152, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 149, date: '2024-03-17', timestamp: 1710691200000 },
        { id: '4', weight: 151, date: '2024-03-18', timestamp: 1710777600000 },
      ];

      const result = calculateWeightTrendEWMA(weights);

      // Trend should be smoother than raw weights
      const rawRange = Math.max(...weights.map(w => w.weight)) - Math.min(...weights.map(w => w.weight));
      const trendRange = Math.max(...result.map(r => r.trend)) - Math.min(...result.map(r => r.trend));

      expect(trendRange).toBeLessThan(rawRange);
    });
  });

  describe('calculateWeightTrendHybrid', () => {
    it('should return empty array for no data', () => {
      const result = calculateWeightTrendHybrid([]);
      expect(result).toEqual([]);
    });

    it('should fall back to EWMA for small datasets', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const hybridResult = calculateWeightTrendHybrid(weights);
      const ewmaResult = calculateWeightTrendEWMA(weights);

      expect(hybridResult).toEqual(ewmaResult);
    });

    it('should use hybrid filter for large datasets', () => {
      // Create 20 days of data (more than HYBRID_EDGE_DAYS * 2 = 10)
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150 + i * 0.1,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const result = calculateWeightTrendHybrid(weights);

      expect(result).toHaveLength(20);
      expect(result[0].date).toBe('2024-03-01');
      expect(result[19].date).toBe('2024-03-20');
    });

    it('should apply EWMA to first edge days', () => {
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const result = calculateWeightTrendHybrid(weights);

      // First 5 days should use EWMA
      expect(result[0].trend).toBe(150);
      expect(result[4].trend).toBeCloseTo(150, 1);
    });

    it('should apply centered average to middle days', () => {
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const result = calculateWeightTrendHybrid(weights);

      // Middle days should use centered average
      const middleIndex = 10;
      expect(result[middleIndex].trend).toBeCloseTo(150, 1);
    });

    it('should apply EWMA to last edge days', () => {
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const result = calculateWeightTrendHybrid(weights);

      // Last 5 days should use EWMA
      expect(result[15].trend).toBeCloseTo(150, 1);
      expect(result[19].trend).toBeCloseTo(150, 1);
    });

    it('should handle weight fluctuations in middle section', () => {
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150 + (i % 2 === 0 ? 2 : -2), // Oscillating pattern
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const result = calculateWeightTrendHybrid(weights);

      // Middle section should smooth out oscillations
      const middleIndex = 10;
      expect(result[middleIndex].trend).toBeCloseTo(150, 0);
    });
  });

  describe('calculateWeightTrend', () => {
    it('should use the hybrid algorithm by default', () => {
      const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150 + i * 0.1,
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        timestamp: 1710518400000 + i * 86400000,
      }));

      const defaultResult = calculateWeightTrend(weights);
      const hybridResult = calculateWeightTrendHybrid(weights);

      expect(defaultResult).toEqual(hybridResult);
    });

    it('should return empty array for no data', () => {
      const result = calculateWeightTrend([]);
      expect(result).toEqual([]);
    });
  });

  describe('getLatestTrendWeight', () => {
    it('should return null for no data', () => {
      const result = getLatestTrendWeight([]);
      expect(result).toBeNull();
    });

    it('should return the most recent trend weight', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = getLatestTrendWeight(weights);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(150);
      expect(result).toBeLessThanOrEqual(152);
    });

    it('should return trend for single entry', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
      ];

      const result = getLatestTrendWeight(weights);

      expect(result).toBe(150);
    });
  });

  describe('getTrendWeightForDate', () => {
    it('should return null for no data', () => {
      const result = getTrendWeightForDate([], '2024-03-15');
      expect(result).toBeNull();
    });

    it('should return trend for specific date', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 152, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = getTrendWeightForDate(weights, '2024-03-16');

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(150);
    });

    it('should return null for date not in data', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
      ];

      const result = getTrendWeightForDate(weights, '2024-03-20');

      expect(result).toBeNull();
    });

    it('should return trend for interpolated date', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 153, date: '2024-03-18', timestamp: 1710777600000 }, // 3 days gap
      ];

      // Should have interpolated data for 2024-03-16 and 2024-03-17
      const result = getTrendWeightForDate(weights, '2024-03-16');

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(150);
      expect(result).toBeLessThan(153);
    });
  });

  describe('edge cases', () => {
    it('should handle very small weight changes', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150.00, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 150.01, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 150.02, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = calculateWeightTrend(weights);

      expect(result).toHaveLength(3);
      expect(result[0].trend).toBeCloseTo(150.00, 2);
      expect(result[2].trend).toBeGreaterThanOrEqual(150.00);
    });

    it('should handle very large weight changes', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 160, date: '2024-03-16', timestamp: 1710604800000 },
        { id: '3', weight: 140, date: '2024-03-17', timestamp: 1710691200000 },
      ];

      const result = calculateWeightTrend(weights);

      expect(result).toHaveLength(3);
      // Trend should still be calculated without errors
      expect(result[1].trend).toBeGreaterThan(150);
    });

    it('should handle negative timestamps', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '1969-12-31', timestamp: -86400000 },
        { id: '2', weight: 151, date: '1970-01-01', timestamp: 0 },
      ];

      const result = calculateWeightTrend(weights);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('1969-12-31');
    });

    it('should handle entries with same timestamp but different dates', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 151, date: '2024-03-16', timestamp: 1710518400000 },
      ];

      const result = calculateWeightTrend(weights);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very long time series', () => {
      // Create 365 days of data
      const weights: WeightEntry[] = Array.from({ length: 365 }, (_, i) => ({
        id: `${i + 1}`,
        weight: 150 + Math.sin(i / 30) * 5, // Sinusoidal pattern
        date: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        timestamp: 1704067200000 + i * 86400000,
      }));

      const result = calculateWeightTrend(weights);

      expect(result).toHaveLength(365);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[364].date).toBe('2024-12-30');
    });

    it('should handle inconsistent weight data', () => {
      const weights: WeightEntry[] = [
        { id: '1', weight: 150, date: '2024-03-15', timestamp: 1710518400000 },
        { id: '2', weight: 150, date: '2024-03-20', timestamp: 1710950400000 }, // 5 day gap
        { id: '3', weight: 150, date: '2024-03-21', timestamp: 1711036800000 },
        { id: '4', weight: 150, date: '2024-03-30', timestamp: 1711814400000 }, // 9 day gap
      ];

      const result = calculateWeightTrend(weights);

      // Should interpolate all missing days
      expect(result.length).toBeGreaterThan(4);
      expect(result.filter(r => r.date === '2024-03-17').length).toBe(1);
      expect(result.filter(r => r.date === '2024-03-25').length).toBe(1);
    });
  });
});
