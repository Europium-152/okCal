import {
  UserProfile,
  WeightEntry,
  FoodEntry,
  FastingDay,
  TDEEEstimate,
  NutritionTarget,
  Sex,
  Goal,
} from '@/types';
import {
  ACTIVITY_MULTIPLIER,
  CALORIES_PER_LB_PER_WEEK,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
  MAX_DEFICIT,
  MAX_SURPLUS,
  MIN_DATA_DAYS,
  MATURE_DATA_DAYS,
  WEIGHT_TREND_DAYS,
  INTAKE_AVERAGE_DAYS,
  PROTEIN_G_PER_LB,
  MIN_FAT_G_PER_LB,
  FAT_PERCENT_OF_CALORIES,
  MIN_CARBS_G,
  CALORIES_PER_G_PROTEIN,
  CALORIES_PER_G_CARBS,
  CALORIES_PER_G_FAT,
  kgFromLbs,
} from '@/constants/nutrition';
import { calculateWeightTrend, getLatestTrendWeight, TrendEntry } from '@/utils/weightTrend';
import { parseDate, getTodayString } from '@/utils/dateHelpers';

interface DailyLog {
  date: string;
  weight?: number;
  calories?: number;
}

export class TDEECalculator {
  private profile: UserProfile;
  private weightEntries: WeightEntry[];
  private foodEntries: FoodEntry[];
  private fastingDays: FastingDay[];
  private trendWeights: TrendEntry[];
  private referenceDate: Date;  // The "today" for this calculation (for historical TDEE)

  constructor(
    profile: UserProfile,
    weightEntries: WeightEntry[],
    foodEntries: FoodEntry[],
    fastingDays: FastingDay[] = [],
    referenceDate?: Date  // Optional: defaults to actual today
  ) {
    this.profile = profile;
    this.weightEntries = weightEntries.sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
    this.foodEntries = foodEntries.sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
    this.fastingDays = fastingDays.sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
    // Calculate trend weights using EWMA
    this.trendWeights = calculateWeightTrend(this.weightEntries);
    // Set reference date (defaults to today for current TDEE calculation)
    this.referenceDate = referenceDate || new Date();
    this.referenceDate.setHours(0, 0, 0, 0);
  }

  /**
   * Calculate BMR using Mifflin-St Jeor equation
   */
  private calculateBMR(weightKg: number): number {
    const heightCm = this.profile.heightCm;
    const age = this.calculateAge();
    const isMale = this.profile.sex === 'male';

    const bmr =
      10 * weightKg +
      6.25 * heightCm -
      5 * age +
      (isMale ? 5 : -161);

    return Math.round(bmr);
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(): number {
    const today = new Date();
    const birthDate = parseDate(this.profile.birthDate); // Use parseDate for local timezone
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculate formula-based TDEE using fixed activity multiplier
   */
  private calculateFormulaTDEE(weightKg: number): number {
    const bmr = this.calculateBMR(weightKg);
    return Math.round(bmr * ACTIVITY_MULTIPLIER);
  }

  /**
   * Get most recent trend weight (smoothed using EWMA)
   */
  private getMostRecentWeight(): number | null {
    if (this.trendWeights.length === 0) return null;
    return this.trendWeights[this.trendWeights.length - 1].trend;
  }

  /**
   * Aggregate daily logs (weight and calorie intake)
   * Weight data: includes reference date (offset by +1 day to capture delayed effect)
   * Calorie data: excludes reference date (only complete days)
   *
   * Example: If reference date is Dec 25:
   * - Calorie data: Dec 11 to Dec 24 (14 days)
   * - Weight data: Dec 12 to Dec 25 (14 days, offset by +1)
   */
  private aggregateDailyLogs(days: number): DailyLog[] {
    const today = new Date(this.referenceDate);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // For calories: use yesterday as end date (exclude today)
    const calorieEndDate = yesterday;
    const calorieStartDate = new Date(calorieEndDate);
    calorieStartDate.setDate(calorieStartDate.getDate() - days + 1);

    // For weight: use today as end date (include today, offset by +1 day)
    const weightEndDate = today;
    const weightStartDate = new Date(weightEndDate);
    weightStartDate.setDate(weightStartDate.getDate() - days + 1);

    const dailyMap = new Map<string, DailyLog>();

    // Add trend weight entries (includes today) - using smoothed EWMA weights
    this.trendWeights.forEach((entry) => {
      const entryDate = parseDate(entry.date); // Use parseDate for local timezone
      entryDate.setHours(0, 0, 0, 0);
      if (entryDate >= weightStartDate && entryDate <= weightEndDate) {
        dailyMap.set(entry.date, {
          date: entry.date,
          weight: entry.trend, // Use trend weight instead of raw scale weight
        });
      }
    });

    // Aggregate food entries by date (excludes today)
    const caloriesByDate = new Map<string, number>();
    this.foodEntries.forEach((entry) => {
      const entryDate = parseDate(entry.date); // Use parseDate for local timezone
      entryDate.setHours(0, 0, 0, 0);
      if (entryDate >= calorieStartDate && entryDate <= calorieEndDate) {
        const current = caloriesByDate.get(entry.date) || 0;
        caloriesByDate.set(entry.date, current + entry.calories);
      }
    });

    // Merge calorie data into daily logs
    caloriesByDate.forEach((calories, date) => {
      const existing = dailyMap.get(date);
      if (existing) {
        existing.calories = calories;
      } else {
        dailyMap.set(date, { date, calories });
      }
    });

    // Add fasting days (0 calories, excludes today)
    this.fastingDays.forEach((entry) => {
      const entryDate = parseDate(entry.date); // Use parseDate for local timezone
      entryDate.setHours(0, 0, 0, 0);
      if (entryDate >= calorieStartDate && entryDate <= calorieEndDate) {
        const existing = dailyMap.get(entry.date);
        if (existing) {
          // If there's already data for this day, set calories to 0 (fasting overrides any food entries)
          existing.calories = 0;
        } else {
          dailyMap.set(entry.date, { date: entry.date, calories: 0 });
        }
      }
    });

    return Array.from(dailyMap.values()).sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
  }

  /**
   * Calculate weight trend using linear regression
   */
  private calculateWeightTrend(): { slope: number; count: number } {
    const logs = this.aggregateDailyLogs(WEIGHT_TREND_DAYS).filter(
      (log) => log.weight !== undefined
    );

    if (logs.length < 3) {
      return { slope: 0, count: logs.length };
    }

    // Linear regression
    const n = logs.length;
    const x = logs.map((_, i) => i);
    const y = logs.map((log) => log.weight!);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Convert slope (lbs per day) to lbs per week
    const slopePerWeek = slope * 7;

    return { slope: slopePerWeek, count: n };
  }

  /**
   * Calculate average calorie intake
   */
  private calculateAverageIntake(): { average: number; count: number } {
    const logs = this.aggregateDailyLogs(INTAKE_AVERAGE_DAYS).filter(
      (log) => log.calories !== undefined
    );

    if (logs.length === 0) {
      return { average: 0, count: 0 };
    }

    const totalCalories = logs.reduce((sum, log) => sum + log.calories!, 0);
    const average = totalCalories / logs.length;

    return { average: Math.round(average), count: logs.length };
  }

  /**
   * Calculate confidence score based on data quality and quantity
   */
  private calculateConfidence(
    dataDays: number,
    weightTrendCount: number,
    intakeCount: number
  ): number {
    // Start with base confidence from data days
    let confidence = 0;

    if (dataDays < MIN_DATA_DAYS) {
      confidence = 0.2;
    } else if (dataDays < MATURE_DATA_DAYS) {
      // Linear interpolation from 0.2 to 1.0
      confidence = 0.2 + (0.8 * (dataDays - MIN_DATA_DAYS)) / (MATURE_DATA_DAYS - MIN_DATA_DAYS);
    } else {
      confidence = 1.0;
    }

    // Penalize for sparse weight data
    const weightDataRatio = weightTrendCount / WEIGHT_TREND_DAYS;
    if (weightDataRatio < 0.5) {
      confidence *= weightDataRatio * 2;
    }

    // Penalize for sparse intake data
    const intakeDataRatio = intakeCount / INTAKE_AVERAGE_DAYS;
    if (intakeDataRatio < 0.5) {
      confidence *= intakeDataRatio * 2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate inferred TDEE from actual data
   */
  private calculateInferredTDEE(
    weightTrendLbsPerWeek: number,
    avgIntake: number
  ): number {
    // inferredTDEE = avgIntake - (weightTrend × CALORIES_PER_LB_PER_WEEK)
    // CALORIES_PER_LB_PER_WEEK: daily calorie adjustment per lb/week weight change
    // If losing weight (negative trend): TDEE = intake - (negative adjustment) = intake + adjustment
    // If gaining weight (positive trend): TDEE = intake - (positive adjustment) = intake - adjustment
    const adjustment = weightTrendLbsPerWeek * CALORIES_PER_LB_PER_WEEK;
    return Math.round(avgIntake - adjustment);
  }

  /**
   * Calculate blended TDEE (formula + inferred)
   */
  private calculateBlendedTDEE(
    formulaTdee: number,
    inferredTdee: number,
    dataDays: number
  ): number {
    // Blending weights based on data maturity
    let formulaWeight: number;
    let dataWeight: number;

    if (dataDays < MIN_DATA_DAYS) {
      formulaWeight = 1.0;
      dataWeight = 0.0;
    } else if (dataDays < MATURE_DATA_DAYS) {
      // Linear transition from 80/20 to 0/100
      const progress = (dataDays - MIN_DATA_DAYS) / (MATURE_DATA_DAYS - MIN_DATA_DAYS);
      formulaWeight = 0.8 - (0.8 * progress);
      dataWeight = 0.2 + (0.8 * progress);
    } else {
      formulaWeight = 0.0;
      dataWeight = 1.0;
    }

    const blended = formulaTdee * formulaWeight + inferredTdee * dataWeight;

    return Math.round(blended);
  }

  /**
   * Main method to calculate TDEE estimate
   */
  calculateTDEEEstimate(): TDEEEstimate | null {
    const currentWeight = this.getMostRecentWeight();
    if (!currentWeight) {
      return null;
    }

    const weightKg = kgFromLbs(currentWeight);
    const formulaTdee = this.calculateFormulaTDEE(weightKg);

    // Get data for calculations
    const { slope: weightTrend, count: weightTrendCount } =
      this.calculateWeightTrend();
    const { average: avgIntake, count: intakeCount } =
      this.calculateAverageIntake();

    // Calculate data days (days since first entry to reference date)
    const firstEntry = this.weightEntries[0] || this.foodEntries[0];
    const dataDays = firstEntry
      ? Math.floor(
          (this.referenceDate.getTime() - parseDate(firstEntry.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    // Calculate confidence
    const confidence = this.calculateConfidence(
      dataDays,
      weightTrendCount,
      intakeCount
    );

    // Calculate inferred TDEE
    const inferredTdee =
      intakeCount >= MIN_DATA_DAYS && weightTrendCount >= 3
        ? this.calculateInferredTDEE(weightTrend, avgIntake)
        : formulaTdee;

    // Calculate blended TDEE
    const blendedTdee = this.calculateBlendedTDEE(
      formulaTdee,
      inferredTdee,
      dataDays
    );

    return {
      date: this.referenceDate.toISOString().split('T')[0],
      formulaTdee,
      inferredTdee,
      blendedTdee,
      confidence,
      dataDays,
      weightTrend,
      avgIntake,
    };
  }

  /**
   * Calculate nutrition targets (calories and macros)
   */
  calculateNutritionTarget(tdeeEstimate: TDEEEstimate): NutritionTarget {
    const currentWeight = this.getMostRecentWeight() || this.profile.targetWeightLbs;
    const goal = this.profile.goal;
    let goalRatePerWeek = this.profile.goalRatePerWeek;

    // For maintain goal, auto-adjust based on weight deviation from target
    if (goal === 'maintain') {
      const weightDeviation = currentWeight - this.profile.targetWeightLbs;
      const MAX_MAINTAIN_RATE = 0.4; // Max 0.4 lbs per week adjustment

      // If more than 1 lb over target, aim to lose 0.4 lbs/week
      // If more than 1 lb under target, aim to gain 0.4 lbs/week
      // Linear scaling between -1 and +1 lb deviation
      if (Math.abs(weightDeviation) > 1) {
        goalRatePerWeek = weightDeviation > 0 ? -MAX_MAINTAIN_RATE : MAX_MAINTAIN_RATE;
      } else {
        // Proportional adjustment for smaller deviations
        goalRatePerWeek = -weightDeviation * MAX_MAINTAIN_RATE;
      }
    }

    // Calculate deficit or surplus
    // 3500 calories per pound, divide by 7 for daily amount
    const dailyAdjustment = goalRatePerWeek * CALORIES_PER_LB_PER_WEEK;

    // Cap the adjustment
    const cappedAdjustment = Math.max(
      -MAX_DEFICIT,
      Math.min(MAX_SURPLUS, dailyAdjustment)
    );

    // Target calories = TDEE + adjustment
    let targetCalories = Math.round(tdeeEstimate.blendedTdee + cappedAdjustment);

    // Apply minimum calorie floor
    const minCalories =
      this.profile.sex === 'male' ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE;
    targetCalories = Math.max(minCalories, targetCalories);

    // Calculate macros
    const proteinG = Math.round(currentWeight * PROTEIN_G_PER_LB[goal]);

    // Fat: greater of minimum or percentage of calories
    const fatFromMinimum = currentWeight * MIN_FAT_G_PER_LB;
    const fatFromPercentage = (targetCalories * FAT_PERCENT_OF_CALORIES) / CALORIES_PER_G_FAT;
    const fatG = Math.round(Math.max(fatFromMinimum, fatFromPercentage));

    // Carbs: remaining calories after protein and fat
    const proteinCalories = proteinG * CALORIES_PER_G_PROTEIN;
    const fatCalories = fatG * CALORIES_PER_G_FAT;
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const carbsG = Math.max(
      MIN_CARBS_G,
      Math.round(remainingCalories / CALORIES_PER_G_CARBS)
    );

    return {
      date: getTodayString(),
      calories: targetCalories,
      proteinG,
      carbsG,
      fatG,
      tdeeEstimate: tdeeEstimate.blendedTdee,
      deficitOrSurplus: cappedAdjustment,
    };
  }
}
