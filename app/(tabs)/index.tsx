import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  getFoodEntries,
  getWeightEntries,
  getUserProfile,
  saveTDEEEstimate,
  getAppSettings,
  getFastingDays,
  generateTDEEDataHash,
  getCachedTDEE,
  saveCachedTDEE,
  getCachedDailyTDEE,
  saveCachedDailyTDEE,
  generateWeightDataHash,
  getCachedWeightTrend,
  saveCachedWeightTrend,
  addDataChangeListener,
} from '@/utils/storage';
import { FoodEntry, WeightEntry, UserProfile, TDEEEstimate, NutritionTarget, Units, FastingDay } from '@/types';
import { formatDate, addDays, parseDate } from '@/utils/dateHelpers';
import { TDEECalculator } from '@/services/TDEECalculator';
import { kgFromLbs, lbsFromKg } from '@/constants/nutrition';
import { WeightChart } from '@/components/WeightChart';
import { CalorieChart } from '@/components/CalorieChart';
import { calculateWeightTrend } from '@/utils/weightTrend';
import { calculateDailyTDEE, calculateDailyTDEEAsync } from '@/services/dailyTDEECalculator';

const screenWidth = Dimensions.get('window').width;

// Circular Progress Component
function CircularProgress({
  size = 80,
  strokeWidth = 6,
  progress = 0,
  color = '#34C759',
  label,
  current,
  target,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  label: string;
  current: number;
  target: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.min(progress, 1); // Cap at 100%
  const strokeDashoffset = circumference * (1 - progressValue);

  return (
    <View style={styles.circularProgressContainer}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progress > 1 ? '#FF6B6B' : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center text */}
        <View style={styles.circularProgressText}>
          <Text style={styles.circularProgressValue}>{current}</Text>
          <Text style={styles.circularProgressTarget}>/ {target}</Text>
        </View>
      </View>
      <Text style={styles.circularProgressLabel}>{label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const navigation = useNavigation();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [fastingDays, setFastingDays] = useState<FastingDay[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tdeeEstimate, setTDEEEstimate] = useState<TDEEEstimate | null>(null);
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null);
  const [units, setUnits] = useState<Units>('imperial');
  const [dailyTDEEData, setDailyTDEEData] = useState<Array<{ date: string; tdee: number }>>([]);
  const [weightTrendData, setWeightTrendData] = useState<Array<{ date: string; weight: number; trend: number }>>([]);
  const [isCalculatingTDEE, setIsCalculatingTDEE] = useState(false);

  // Track the current TDEE calculation to allow cancellation
  const currentCalculationId = useRef<number>(0);
  // Track the hash of data used for the last calculation to avoid redundant calculations
  const lastCalculationHash = useRef<string | null>(null);

  const loadData = async () => {
    const startTime = Date.now();
    console.log(`[DASHBOARD] loadData START`);

    // This makes the app much faster when switching between tabs
    const fetchStart = Date.now();
    const [food, weight, userProfile, settings, fasting] = await Promise.all([
      getFoodEntries(),
      getWeightEntries(),
      getUserProfile(),
      getAppSettings(),
      getFastingDays(),
    ]);
    console.log(`[DASHBOARD] loadData initial data fetch took ${Date.now() - fetchStart}ms (${food.length} food, ${weight.length} weight, ${fasting.length} fasting)`);
    if (food.length > 0) {
      console.log(`[DASHBOARD] loadData food entry dates: ${food.map(f => f.date).join(', ')}`);
    }

    const stateStart = Date.now();
    setFoodEntries(food);
    setWeightEntries(weight);
    setFastingDays(fasting);
    setProfile(userProfile);
    setUnits(settings.units);
    console.log(`[DASHBOARD] loadData state updates took ${Date.now() - stateStart}ms`);

    // Calculate weight trend (with caching)
    if (weight.length > 0) {
      const weightTrendStart = Date.now();
      const weightHash = generateWeightDataHash(weight);
      console.log(`[DASHBOARD] loadData weight hash generated: ${weightHash.substring(0, 8)}...`);

      // Try to get cached weight trend
      const cacheCheckStart = Date.now();
      let cachedTrend = await getCachedWeightTrend(weightHash);
      console.log(`[DASHBOARD] loadData weight trend cache check took ${Date.now() - cacheCheckStart}ms (${cachedTrend ? 'HIT' : 'MISS'})`);

      // If no valid cache, calculate fresh
      if (!cachedTrend) {
        const calcStart = Date.now();
        cachedTrend = calculateWeightTrend(weight);
        console.log(`[DASHBOARD] loadData weight trend calculation took ${Date.now() - calcStart}ms`);

        // Save to cache
        if (cachedTrend.length > 0) {
          const saveCacheStart = Date.now();
          await saveCachedWeightTrend(cachedTrend, weightHash);
          console.log(`[DASHBOARD] loadData weight trend cache save took ${Date.now() - saveCacheStart}ms`);
        }
      }

      setWeightTrendData(cachedTrend);
      console.log(`[DASHBOARD] loadData weight trend COMPLETE - took ${Date.now() - weightTrendStart}ms`);
    }

    console.log(`[DASHBOARD] loadData COMPLETE - total ${Date.now() - startTime}ms`);

    // Calculate TDEE asynchronously (non-blocking) if profile exists
    // This allows the UI to remain responsive even during expensive TDEE calculations
    if (userProfile && weight.length > 0) {
      // Generate hash to check if data has changed since last calculation
      const currentHash = generateTDEEDataHash(userProfile, weight, food, fasting);

      // Only start new calculation if data has actually changed OR nutritionTarget is missing
      console.log(`[DASHBOARD] loadData checking if calculation needed. Current nutritionTarget: ${nutritionTarget ? 'exists' : 'null'}`);
      if (lastCalculationHash.current !== currentHash || !nutritionTarget) {
        console.log(`[DASHBOARD] loadData data changed OR nutritionTarget is null, starting new calculation`);
        console.log(`  - Old hash: ${lastCalculationHash.current?.substring(0, 12) || 'none'}...`);
        console.log(`  - New hash: ${currentHash.substring(0, 12)}...`);
        console.log(`  - nutritionTarget: ${nutritionTarget ? 'exists' : 'NULL (forcing recalculation)'}`);
        console.log(`  - Food entries count: ${food.length}`);

        // Cancel any ongoing calculation by incrementing the ID
        currentCalculationId.current += 1;
        const thisCalculationId = currentCalculationId.current;
        lastCalculationHash.current = currentHash; // Update hash for next check

        // CRITICAL: Create immutable snapshots of data to prevent corruption
        // If user edits data while calculation is running, the calculation should
        // continue with the original data, not get corrupted by changes
        const profileSnapshot = { ...userProfile };
        const weightSnapshot = weight.map(w => ({ ...w }));
        const foodSnapshot = food.map(f => ({ ...f }));
        const fastingSnapshot = fasting.map(f => ({ ...f }));

        // Use InteractionManager to defer TDEE calculation until after the UI has rendered
        // This ensures the screen loads quickly and remains responsive
        InteractionManager.runAfterInteractions(() => {
          calculateTDEEAsync(profileSnapshot, weightSnapshot, foodSnapshot, fastingSnapshot, thisCalculationId);
        });
      } else {
        console.log(`[DASHBOARD] loadData data unchanged AND nutritionTarget exists, using existing calculation (hash: ${currentHash.substring(0, 12)}...)`);
      }
    }
  };

  // Async TDEE calculation that doesn't block the UI
  const calculateTDEEAsync = async (
    userProfile: UserProfile,
    weight: WeightEntry[],
    food: FoodEntry[],
    fasting: FastingDay[],
    calculationId: number
  ) => {
    const tdeeStart = Date.now();
    console.log(`[DASHBOARD] calculateTDEEAsync START (ID: ${calculationId})`);

    // Check if this calculation was cancelled before we even started
    if (currentCalculationId.current !== calculationId) {
      console.log(`[DASHBOARD] calculateTDEEAsync CANCELLED before start (ID: ${calculationId})`);
      return;
    }

    // Generate hash of current data
    const hashStart = Date.now();
    const dataHash = generateTDEEDataHash(userProfile, weight, food, fasting);
    console.log(`[DASHBOARD] calculateTDEEAsync hash generated in ${Date.now() - hashStart}ms: ${dataHash.substring(0, 8)}...`);

    // Calculate daily TDEE for chart first (includes latest TDEE)
    let estimate = null;
    console.log(`[DASHBOARD] calculateTDEEAsync checking food/fasting: food.length=${food.length}, fasting.length=${fasting.length}`);
    if (food.length > 0 || fasting.length > 0) {
      const dailyTDEEStart = Date.now();

      // Determine date range
      const yesterday = formatDate(addDays(new Date(), -1));
      console.log(`[DASHBOARD] calculateTDEEAsync yesterday date: ${yesterday}`);
      const allDates = [
        ...food.map(f => f.date),
        ...fasting.map(f => f.date)
      ].filter(d => d <= yesterday);
      console.log(`[DASHBOARD] calculateTDEEAsync allDates after filter: ${allDates.length} dates (filtered to <= ${yesterday})`);
      console.log(`[DASHBOARD] calculateTDEEAsync food dates: ${food.map(f => f.date).join(', ')}`);

      if (allDates.length > 0) {
        const earliestDate = allDates.reduce((min, d) => d < min ? d : min);
        console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE date range: ${earliestDate} to ${yesterday}`);

        // Try to get cached daily TDEE
        const dailyCacheStart = Date.now();
        let dailyTDEEs = await getCachedDailyTDEE(dataHash, earliestDate, yesterday);
        console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE cache check took ${Date.now() - dailyCacheStart}ms (${dailyTDEEs ? 'HIT' : 'MISS'})`);

        // If no valid cache, calculate fresh (this is the expensive part)
        if (!dailyTDEEs) {
          console.log(`[DASHBOARD] calculateTDEEAsync calculating daily TDEE (this may take 10-20 seconds)...`);

          // Show loading indicator
          setIsCalculatingTDEE(true);

          // Use async version that yields to UI thread periodically
          const dailyCalcStart = Date.now();
          dailyTDEEs = await calculateDailyTDEEAsync(
            userProfile,
            weight,
            food,
            fasting,
            earliestDate,
            yesterday,
            (current, total) => {
              console.log(`[DASHBOARD] TDEE calculation progress: ${current}/${total} days`);
            },
            () => {
              // Check if this calculation has been cancelled
              const isCancelled = currentCalculationId.current !== calculationId;
              if (isCancelled) {
                console.log(`[DASHBOARD] shouldCancel check: calculation ${calculationId} is cancelled (current: ${currentCalculationId.current})`);
              }
              return isCancelled;
            }
          );
          console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE calculation took ${Date.now() - dailyCalcStart}ms (${dailyTDEEs.length} days)`);

          // Check if calculation was cancelled by ID change
          // Note: Empty array is NOT a cancellation - it means insufficient data, which is handled by fallback
          if (currentCalculationId.current !== calculationId) {
            console.log(`[DASHBOARD] calculateTDEEAsync CANCELLED after calculation (ID: ${calculationId})`);
            setIsCalculatingTDEE(false);
            return;
          }

          // Log if insufficient data for daily TDEE (but continue to fallback)
          if (dailyTDEEs.length === 0) {
            console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE returned 0 days (insufficient data: need >=3 weight entries and >=7 days of food data)`);
          }

          // Save to cache
          if (dailyTDEEs.length > 0) {
            const saveDailyStart = Date.now();
            await saveCachedDailyTDEE(dailyTDEEs, dataHash, earliestDate, yesterday);
            console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE cache save took ${Date.now() - saveDailyStart}ms`);
          }

          setIsCalculatingTDEE(false); // Hide loading indicator
        }

        // Final check before updating state
        if (currentCalculationId.current !== calculationId) {
          console.log(`[DASHBOARD] calculateTDEEAsync CANCELLED before state update (ID: ${calculationId})`);
          return;
        }

        setDailyTDEEData(dailyTDEEs);

        // Calculate proper TDEE estimate with all fields (confidence, dataDays, etc.)
        const estimateStart = Date.now();
        const calculator = new TDEECalculator(
          userProfile,
          weight,
          food,
          fasting
        );
        estimate = calculator.calculateTDEEEstimate();
        console.log(`[DASHBOARD] calculateTDEEAsync TDEE estimate calculation took ${Date.now() - estimateStart}ms`);

        if (estimate) {
          setTDEEEstimate(estimate);

          // Calculate nutrition target using the TDEE estimate
          const targetStart = Date.now();
          const target = calculator.calculateNutritionTarget(estimate);
          setNutritionTarget(target);
          console.log(`[DASHBOARD] calculateTDEEAsync nutrition target calculation took ${Date.now() - targetStart}ms`);
        }

        console.log(`[DASHBOARD] calculateTDEEAsync daily TDEE COMPLETE - took ${Date.now() - dailyTDEEStart}ms`);
      } else {
        console.log(`[DASHBOARD] calculateTDEEAsync SKIPPED - allDates.length is 0 (all food/fasting entries are for today or later)`);
      }
    } else {
      console.log(`[DASHBOARD] calculateTDEEAsync SKIPPED - no food or fasting entries`);
    }

    // FALLBACK: If no estimate was calculated (no historical data), use formula-based TDEE
    // This ensures new users or users with only today's data still get nutrition recommendations
    if (!estimate && weight.length > 0) {
      console.log(`[DASHBOARD] calculateTDEEAsync FALLBACK - No historical data available, using formula-based TDEE`);
      console.log(`[DASHBOARD] calculateTDEEAsync FALLBACK - This is normal for new users or when all food entries are for today`);
      const fallbackStart = Date.now();

      const calculator = new TDEECalculator(
        userProfile,
        weight,
        food,
        fasting
      );

      // Calculate formula-based TDEE estimate
      estimate = calculator.calculateTDEEEstimate();
      console.log(`[DASHBOARD] calculateTDEEAsync FALLBACK TDEE estimate calculation took ${Date.now() - fallbackStart}ms`);

      if (estimate) {
        setTDEEEstimate(estimate);

        // Calculate nutrition target using the formula-based TDEE
        const targetStart = Date.now();
        const target = calculator.calculateNutritionTarget(estimate);
        setNutritionTarget(target);
        console.log(`[DASHBOARD] calculateTDEEAsync FALLBACK nutrition target calculation took ${Date.now() - targetStart}ms`);
        console.log(`[DASHBOARD] calculateTDEEAsync FALLBACK - formula-based target: ${target.calories} cal (TDEE: ${estimate.blendedTdee}, confidence: ${Math.round(estimate.confidence * 100)}%)`);
      }
    }

    console.log(`[DASHBOARD] calculateTDEEAsync COMPLETE - took ${Date.now() - tdeeStart}ms (estimate: ${estimate ? 'calculated' : 'null'}, nutritionTarget will be: ${estimate ? 'calculated' : 'null'})`);
  };

  // Listen for data changes and reload data + cancel ongoing calculation
  useEffect(() => {
    const unsubscribe = addDataChangeListener(() => {
      console.log(`[DASHBOARD] Data changed - reloading data and cancelling ongoing calculation (ID: ${currentCalculationId.current})`);
      // Increment ID to cancel any ongoing calculation
      currentCalculationId.current += 1;
      // Clear the last hash so next loadData will start a new calculation
      lastCalculationHash.current = null;
      // Hide loading indicator
      setIsCalculatingTDEE(false);
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log(`[DASHBOARD] useFocusEffect TRIGGERED`);
      const focusStartTime = Date.now();
      loadData().then(() => {
        console.log(`[DASHBOARD] useFocusEffect loadData promise resolved - total ${Date.now() - focusStartTime}ms`);
      });

      return () => {
        // Cleanup function - runs when screen loses focus
        // We intentionally DON'T cancel the calculation here because:
        // 1. If user just navigates away and back, calculation should continue
        // 2. Calculation only cancels when data actually changes (handled in loadData)
        // 3. This allows calculation to complete in background while user is on other screens
        console.log(`[DASHBOARD] useFocusEffect cleanup - screen unfocused (calculation continues in background)`);
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Transform weight data for chart - using D3 time scale with EWMA trend
  const weightChartData = useMemo(() => {
    if (weightEntries.length === 0) return [];

    // Create a map of trend weights by date
    const trendMap = new Map(weightTrendData.map(t => [t.date, t.trend]));

    // Group weights by date and calculate daily averages
    const weightsByDate = new Map<string, number[]>();

    weightEntries.forEach(entry => {
      const existing = weightsByDate.get(entry.date) || [];
      existing.push(entry.weight);
      weightsByDate.set(entry.date, existing);
    });

    // Calculate averages and include trend data
    const dailyAverages = Array.from(weightsByDate.entries())
      .map(([dateStr, weights]) => {
        const avgWeightLbs = weights.reduce((sum, w) => sum + w, 0) / weights.length;
        const trendWeightLbs = trendMap.get(dateStr);

        // Convert to user's preferred unit
        const weightInUserUnit = units === 'metric' ? kgFromLbs(avgWeightLbs) : avgWeightLbs;
        const trendInUserUnit = trendWeightLbs
          ? (units === 'metric' ? kgFromLbs(trendWeightLbs) : trendWeightLbs)
          : undefined;

        return {
          date: parseDate(dateStr), // Use parseDate for local timezone parsing
          weightKg: weightInUserUnit,     // Scale weight (actual logged value)
          trendKg: trendInUserUnit,       // Trend weight (EWMA smoothed)
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Return all data - the chart will handle filtering based on selected range
    return dailyAverages;
  }, [weightEntries, weightTrendData, units]);

  // Transform calorie data for chart - using D3 time scale with daily TDEE
  const calorieChartData = useMemo(() => {
    if (foodEntries.length === 0 && fastingDays.length === 0) return [];

    // Only include completed days (yesterday and earlier)
    const yesterday = formatDate(addDays(new Date(), -1));
    const yesterdayDate = parseDate(yesterday); // Use parseDate for local timezone
    yesterdayDate.setHours(23, 59, 59, 999);

    // OPTIMIZED: Pre-compute calorie totals by date using a Map (O(n) instead of O(n²))
    const caloriesByDate = new Map<string, number>();
    foodEntries.forEach(entry => {
      const entryDate = parseDate(entry.date); // Use parseDate for local timezone
      if (entryDate <= yesterdayDate) {
        const current = caloriesByDate.get(entry.date) || 0;
        caloriesByDate.set(entry.date, current + entry.calories);
      }
    });

    // OPTIMIZED: Pre-compute fasting days using a Set for O(1) lookups
    const fastingDatesSet = new Set(
      fastingDays
        .filter(f => parseDate(f.date) <= yesterdayDate) // Use parseDate for local timezone
        .map(f => f.date)
    );

    // Get all unique dates from calories and fasting
    const allDates = Array.from(new Set([
      ...Array.from(caloriesByDate.keys()),
      ...Array.from(fastingDatesSet)
    ])).sort();

    if (allDates.length === 0) return [];

    // Use cached daily TDEE data from state instead of recalculating
    const tdeeMap = new Map(dailyTDEEData.map(t => [t.date, t.tdee]));

    // Find the earliest and latest dates to fill in missing days
    const earliestDate = parseDate(allDates[0]); // Use parseDate for local timezone
    const latestDate = parseDate(allDates[allDates.length - 1]); // Use parseDate for local timezone

    // Fill in ALL days between earliest and latest (including missing days)
    const data: Array<{ date: Date; calories: number; tdee?: number }> = [];
    const currentDate = new Date(earliestDate);

    while (currentDate <= latestDate) {
      const dateString = formatDate(currentDate);

      // OPTIMIZED: O(1) Map lookup instead of O(n) filter + reduce
      const totalCalories = caloriesByDate.get(dateString) || 0;

      // Include ALL days in the range (logged, fasting, or empty)
      data.push({
        date: new Date(currentDate),
        calories: totalCalories, // Will be 0 for unlogged days
        tdee: tdeeMap.get(dateString),
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }, [foodEntries, fastingDays, dailyTDEEData]);

  // Calculate today's stats - memoized to avoid recalculation on every render
  const todayStats = useMemo(() => {
    const todayString = formatDate(new Date());
    const todayEntries = foodEntries.filter(entry => entry.date === todayString);
    const todayCalories = todayEntries.reduce((sum, entry) => sum + entry.calories, 0);
    const todayProtein = todayEntries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
    const todayCarbs = todayEntries.reduce((sum, entry) => sum + (entry.carbs || 0), 0);
    const todayFat = todayEntries.reduce((sum, entry) => sum + (entry.fat || 0), 0);

    return {
      todayString,
      todayEntries,
      todayCalories,
      todayProtein,
      todayCarbs,
      todayFat,
    };
  }, [foodEntries]);

  const { todayString, todayEntries, todayCalories, todayProtein, todayCarbs, todayFat } = todayStats;

  // Check if user has met their calorie target
  const hasMetTarget = nutritionTarget && todayCalories >= nutritionTarget.calories * 0.95 && todayCalories <= nutritionTarget.calories * 1.05;

  // Calculate average calories (last 7 days)
  const avgCalories = useMemo(() => {
    return calorieChartData.length > 0
      ? Math.round(calorieChartData.reduce((sum, d) => sum + d.calories, 0) / calorieChartData.length)
      : 0;
  }, [calorieChartData]);

  // Get latest trend weight in user's preferred units
  const latestTrendWeight = useMemo(() => {
    if (weightTrendData.length === 0) return null;

    const latestTrendLbs = weightTrendData[weightTrendData.length - 1].trend;
    return units === 'metric' ? kgFromLbs(latestTrendLbs) : latestTrendLbs;
  }, [weightTrendData, units]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity
          style={styles.logWeightButton}
          onPress={() => navigation.navigate('LogWeight')}
        >
          <Ionicons name="scale" size={20} color="#fff" />
          <Text style={styles.logWeightText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      {/* Congratulations Banner */}
      {hasMetTarget && (
        <View style={styles.congratsBanner}>
          <View style={styles.congratsContent}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <View style={styles.congratsTextContainer}>
              <Text style={styles.congratsTitle}>Congratulations!</Text>
              <Text style={styles.congratsSubtext}>You have reached today's nutritional targets</Text>
            </View>
            <Ionicons name="star" size={24} color="#FFD700" />
          </View>
        </View>
      )}

      {/* TDEE Calculation Loading Indicator */}
      {isCalculatingTDEE && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <View style={styles.loadingTextContainer}>
              <Text style={styles.loadingTitle}>Calculating TDEE...</Text>
              <Text style={styles.loadingSubtext}>This may take 10-20 seconds. You can navigate away and come back.</Text>
            </View>
          </View>
        </View>
      )}

      {/* Nutrition Targets */}
      {nutritionTarget ? (
        <View style={[styles.targetContainer, hasMetTarget && styles.targetContainerGold]}>
          <Text style={styles.targetTitle}>Today's Nutrition Targets</Text>

          {/* Calories */}
          <View style={styles.calorieSection}>
            <Text style={styles.calorieLabel}>Calories</Text>
            <Text style={styles.calorieValue}>
              {todayCalories} / {nutritionTarget.calories}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (todayCalories / nutritionTarget.calories) * 100)}%`,
                    backgroundColor: hasMetTarget
                      ? '#FFD700'
                      : todayCalories > nutritionTarget.calories
                        ? '#FF6B6B'
                        : '#34C759',
                  },
                ]}
              />
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macroRow}>
            <CircularProgress
              size={90}
              strokeWidth={7}
              progress={todayProtein / nutritionTarget.proteinG}
              color={hasMetTarget ? "#FFD700" : "#FF6B6B"}
              label="Protein"
              current={Math.round(todayProtein)}
              target={nutritionTarget.proteinG}
            />
            <CircularProgress
              size={90}
              strokeWidth={7}
              progress={todayCarbs / nutritionTarget.carbsG}
              color={hasMetTarget ? "#FFD700" : "#4ECDC4"}
              label="Carbs"
              current={Math.round(todayCarbs)}
              target={nutritionTarget.carbsG}
            />
            <CircularProgress
              size={90}
              strokeWidth={7}
              progress={todayFat / nutritionTarget.fatG}
              color={hasMetTarget ? "#FFD700" : "#FFD93D"}
              label="Fat"
              current={Math.round(todayFat)}
              target={nutritionTarget.fatG}
            />
          </View>

          {/* Expenditure Info */}
          {tdeeEstimate && (
            <View style={styles.tdeeInfo}>
              <Text style={styles.tdeeLabel}>
                Estimated Expenditure: <Text style={styles.tdeeValue}>{tdeeEstimate.blendedTdee} cal</Text>
              </Text>
              <Text style={styles.tdeeLabel}>
                Confidence: <Text style={styles.tdeeValue}>{Math.round(tdeeEstimate.confidence * 100)}%</Text>
              </Text>
              <Text style={styles.tdeeSubtext}>
                {tdeeEstimate.dataDays < 7
                  ? 'Collecting data... More accurate estimates in ' + (7 - tdeeEstimate.dataDays) + ' days'
                  : tdeeEstimate.dataDays < 28
                  ? 'Good data quality. Estimate will mature in ' + (28 - tdeeEstimate.dataDays) + ' days'
                  : 'Mature estimate based on your tracking data'}
              </Text>
            </View>
          )}
        </View>
      ) : profile ? (
        <View style={styles.targetContainer}>
          <Ionicons name="information-circle-outline" size={48} color="#999" />
          <Text style={styles.emptyTargetText}>
            Log your weight to see calorie recommendations
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('LogWeight')}
          >
            <Text style={styles.setupButtonText}>Log Weight</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.targetContainer}>
          <Ionicons name="trophy-outline" size={48} color="#999" />
          <Text style={styles.emptyTargetText}>
            Set up your profile and goals to get personalized recommendations
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('Goals')}
          >
            <Text style={styles.setupButtonText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Calories Chart */}
      <View style={styles.chartSection}>
        <CalorieChart data={calorieChartData} height={280} />
      </View>

      {/* Weight Chart */}
      <View style={styles.chartSection}>
        <WeightChart data={weightChartData} height={280} unit={units === 'metric' ? 'kg' : 'lbs'} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  logWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  logWeightText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  addWeightButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addWeightButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  targetContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  targetContainerGold: {
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  congratsBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  congratsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  congratsTextContainer: {
    alignItems: 'center',
  },
  congratsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B8860B',
    marginBottom: 4,
  },
  congratsSubtext: {
    fontSize: 13,
    color: '#8B6914',
    textAlign: 'center',
  },
  loadingContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingTextContainer: {
    flex: 1,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#1976D2',
  },
  targetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  calorieSection: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  circularProgressTarget: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  circularProgressLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  tdeeInfo: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  tdeeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tdeeValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  tdeeSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTargetText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
