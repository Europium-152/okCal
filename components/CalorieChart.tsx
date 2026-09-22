import { formatYAxisLabel, generateUniqueTicks, getStartDateForRange } from '@/utils/chartHelpers';
import { addDays } from '@/utils/dateHelpers';
import * as scale from 'd3-scale';
import * as shape from 'd3-shape';
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, Grid, LineChart, XAxis, YAxis } from 'react-native-svg-charts';

interface CalorieDataPoint {
  date: Date;
  calories: number;
  tdee?: number;  // Optional TDEE estimate for this date
}

interface CalorieChartProps {
  data: CalorieDataPoint[];
  height?: number;
}

type DateRange = '2W' | '1M' | '6M' | '1Y' | 'All';

export function CalorieChart({ data, height = 250 }: CalorieChartProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>('2W');

  // Handle empty state
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No calorie data yet</Text>
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

  if (filteredData.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data for selected range</Text>
        <DateRangeSelector selected={selectedRange} onSelect={setSelectedRange} />
      </View>
    );
  }

  // Handle single data point - create extended date range for proper bar rendering
  // BarChart needs a range to properly size the bars
  const chartData = useMemo(() => {
    if (filteredData.length === 1) {
      // Create points for day before and day after to give the bar proper width
      const onlyPoint = filteredData[0];
      const dayBefore = addDays(onlyPoint.date, -1);
      const dayAfter = addDays(onlyPoint.date, 1);

      return [
        { date: dayBefore, calories: 0, tdee: onlyPoint.tdee },
        onlyPoint,
        { date: dayAfter, calories: 0, tdee: onlyPoint.tdee },
      ];
    }
    return filteredData;
  }, [filteredData]);

  const contentInset = { top: 20, bottom: 20, left: 10, right: 10 };

  // OPTIMIZED: Memoize derived values to prevent recalculation
  const { hasTDEEData, minValue, maxValue, xDomain } = useMemo(() => {
    const hasTDEE = chartData.some(d => d.tdee !== undefined);
    const allValues = chartData.flatMap(d => [d.calories, d.tdee].filter(v => v !== undefined) as number[]);
    const maxVal = Math.max(...allValues);

    // Ensure minimum Y-axis range of 500 calories for better visualization
    const minRange = 500;
    const adjustedMax = Math.max(maxVal, minRange);

    return {
      hasTDEEData: hasTDEE,
      minValue: 0,  // Always start at 0 for calorie charts
      maxValue: adjustedMax,
      xDomain: [chartData[0].date, chartData[chartData.length - 1].date],
    };
  }, [chartData]);

  return (
    <View style={[styles.container, { height }]}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendText}>Intake Calories</Text>
        </View>
        {hasTDEEData && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#4ECDC4' }]} />
            <Text style={styles.legendText}>Expenditure</Text>
          </View>
        )}
      </View>

      <View style={styles.chartRow}>
        {/* Y-Axis */}
        <YAxis
          data={chartData.map(d => d.calories)}
          numberOfTicks={5}
          contentInset={contentInset}
          svg={{ fill: '#666', fontSize: 10 }}
          formatLabel={(value) => Math.round(value).toString()}
          style={styles.yAxis}
          min={minValue}
          max={maxValue}
        />

        {/* Main Chart */}
        <View style={styles.chartContainer}>
          {/* Bar Chart for Calories */}
          <BarChart
            style={StyleSheet.absoluteFill}
            data={chartData}
            yAccessor={({ item }) => item.calories}
            xAccessor={({ item }) => item.date}
            xScale={scale.scaleTime}
            contentInset={contentInset}
            svg={{ fill: '#FF6B6B' }}
            numberOfTicks={5}
            gridMin={minValue}
            gridMax={maxValue}
            xMin={xDomain[0]}
            xMax={xDomain[1]}
          >
            <Grid svg={{ stroke: '#eee' }} />
          </BarChart>

          {/* Line Chart for TDEE */}
          {hasTDEEData && (
            <LineChart
              style={StyleSheet.absoluteFill}
              data={chartData.filter(d => d.tdee !== undefined)}
              yAccessor={({ item }) => item.tdee!}
              xAccessor={({ item }) => item.date}
              xScale={scale.scaleTime}
              contentInset={contentInset}
              svg={{ stroke: '#4ECDC4', strokeWidth: 3 }}
              curve={shape.curveMonotoneX}
              numberOfTicks={5}
              yMin={minValue}
              yMax={maxValue}
              xMin={xDomain[0]}
              xMax={xDomain[1]}
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
  legendBar: {
    width: 16,
    height: 16,
    borderRadius: 2,
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
    marginBottom: 20,
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
    backgroundColor: '#FF6B6B',
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
