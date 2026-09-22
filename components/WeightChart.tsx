import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart, XAxis, YAxis, Grid } from 'react-native-svg-charts';
import * as scale from 'd3-scale';
import * as shape from 'd3-shape';
import { Circle } from 'react-native-svg';
import { generateUniqueTicks, getStartDateForRange } from '@/utils/chartHelpers';
import { addDays } from '@/utils/dateHelpers';

interface WeightDataPoint {
  date: Date;
  weightKg: number;      // Scale weight (actual logged value)
  trendKg?: number;      // Trend weight (EWMA smoothed value)
}

interface WeightChartProps {
  data: WeightDataPoint[];
  height?: number;
  unit?: 'kg' | 'lbs';
}

type DateRange = '2W' | '1M' | '6M' | '1Y' | 'All';

export function WeightChart({ data, height = 250, unit = 'kg' }: WeightChartProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>('1M');

  // Handle empty state
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No weight data yet</Text>
      </View>
    );
  }

  // OPTIMIZED: Memoize filtered data to prevent recalculation on every render
  const filteredData = useMemo(() => {
    // Skip expensive filtering if "All" is selected
    if (selectedRange === 'All') {
      return data;
    }

    // OPTIMIZED: Only compute start date, avoid creating allDates array
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysBack: number;
    switch (selectedRange) {
      case '2W': daysBack = 14; break;
      case '1M': daysBack = 30; break;
      case '6M': daysBack = 180; break;
      case '1Y': daysBack = 365; break;
      default: return data;
    }

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    // Filter data based on start date
    return data.filter(d => d.date >= startDate);
  }, [data, selectedRange]);

  // Handle single data point - create a duplicate point for chart rendering
  // LineChart needs at least 2 points to render, so we create a virtual point
  const chartData = useMemo(() => {
    if (filteredData.length === 1) {
      // Create a second point 1 day before with the same weight
      const onlyPoint = filteredData[0];
      const dayBefore = addDays(onlyPoint.date, -1);

      return [
        {
          date: dayBefore,
          weightKg: onlyPoint.weightKg,
          trendKg: onlyPoint.trendKg,
        },
        onlyPoint
      ];
    }
    return filteredData;
  }, [filteredData]);

  const contentInset = { top: 20, bottom: 20, left: 10, right: 10 };

  // OPTIMIZED: Memoize derived values to prevent recalculation
  const { hasTrendData, minWeight, maxWeight } = useMemo(() => {
    const hasTrend = chartData.some(d => d.trendKg !== undefined);
    const allWeights = chartData.flatMap(d => [d.weightKg, d.trendKg].filter(w => w !== undefined) as number[]);

    const min = Math.min(...allWeights);
    const max = Math.max(...allWeights);
    const range = max - min;

    // Ensure minimum range of 1 unit (kg or lbs) for better visualization
    const minRange = 1;

    if (range < minRange) {
      // Center the weight and add 0.5 units above and below
      const center = (min + max) / 2;
      return {
        hasTrendData: hasTrend,
        minWeight: center - (minRange / 2),
        maxWeight: center + (minRange / 2),
      };
    }

    // For larger ranges, add small padding (5% of range or 0.5 units, whichever is larger)
    const padding = Math.max(range * 0.05, 0.5);

    return {
      hasTrendData: hasTrend,
      minWeight: min - padding,
      maxWeight: max + padding,
    };
  }, [chartData]);

  // Decorator for scale weight dots (small, light)
  const ScaleWeightDots = ({ x, y, data }: any) => {
    return data.map((item: WeightDataPoint, index: number) => (
      <Circle
        key={`scale-${index}`}
        cx={x(item.date)}
        cy={y(item.weightKg)}
        r={3}
        stroke="#B8E8E6"
        fill="white"
        strokeWidth={1.5}
        opacity={0.6}
      />
    ));
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#D3D3D3', opacity: 0.5 }]} />
          <Text style={styles.legendText}>Measured Weight</Text>
        </View>
        {hasTrendData && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#4ECDC4' }]} />
            <Text style={styles.legendText}>Trend</Text>
          </View>
        )}
      </View>

      <View style={styles.chartRow}>
        {/* Y-Axis */}
        <YAxis
          data={chartData.map(d => d.weightKg)}
          numberOfTicks={5}
          contentInset={contentInset}
          svg={{ fill: '#666', fontSize: 10 }}
          formatLabel={(value) => `${value.toFixed(1)}`}
          style={styles.yAxis}
          min={minWeight}
          max={maxWeight}
        />

        {/* Main Chart */}
        <View style={styles.chartContainer}>
          {/* Scale Weight Line (faded) */}
          <LineChart
            style={StyleSheet.absoluteFill}
            data={chartData}
            yAccessor={({ item }) => item.weightKg}
            xAccessor={({ item }) => item.date}
            xScale={scale.scaleTime}
            contentInset={contentInset}
            svg={{ stroke: '#D3D3D3', strokeWidth: 1.5, opacity: 0.5 }}
            curve={shape.curveMonotoneX}
            yMin={minWeight}
            yMax={maxWeight}
          >
            <Grid svg={{ stroke: '#eee' }} />
            <ScaleWeightDots />
          </LineChart>

          {/* Trend Weight Line (bold) - NO dots */}
          {hasTrendData && (
            <LineChart
              style={StyleSheet.absoluteFill}
              data={chartData.filter(d => d.trendKg !== undefined)}
              yAccessor={({ item }) => item.trendKg!}
              xAccessor={({ item }) => item.date}
              xScale={scale.scaleTime}
              contentInset={contentInset}
              svg={{ stroke: '#4ECDC4', strokeWidth: 3 }}
              curve={shape.curveMonotoneX}
              yMin={minWeight}
              yMax={maxWeight}
            />
          )}

          {/* X-Axis */}
          <XAxis
            data={chartData}
            xAccessor={({ item }) => item.date}
            scale={scale.scaleTime}
            numberOfTicks={4}
            contentInset={{ left: 10, right: 10 }}
            svg={{ fill: '#666', fontSize: 10 }}
            formatLabel={(value) => {
              const date = new Date(value);
              return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }}
            style={styles.xAxis}
          />
        </View>
      </View>

      {/* Date Range Selector */}
      <DateRangeSelector selected={selectedRange} onSelect={setSelectedRange} />
    </View>
  );
}

function DateRangeSelector({
  selected,
  onSelect
}: {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}) {
  const ranges: DateRange[] = ['2W', '1M', '6M', '1Y', 'All'];

  return (
    <View style={styles.rangeSelector}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.rangeButton,
            selected === range && styles.rangeButtonActive,
          ]}
          onPress={() => onSelect(range)}
        >
          <Text
            style={[
              styles.rangeButtonText,
              selected === range && styles.rangeButtonTextActive,
            ]}
          >
            {range}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 80,
  },
  singlePointText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 80,
    fontSize: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  chartRow: {
    flexDirection: 'row',
    flex: 1,
  },
  yAxis: {
    width: 40,
    marginBottom: 20,  // Space for x-axis
  },
  chartContainer: {
    flex: 1,
  },
  xAxis: {
    height: 20,
    marginTop: 4,
  },
  rangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  rangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  rangeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  rangeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },
});
