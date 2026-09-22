import { Goal } from '@/types';

// Fixed activity multiplier for all users (middle-range value)
export const ACTIVITY_MULTIPLIER = 1.55;

export const CALORIES_PER_LB_PER_WEEK = 500; // Daily calorie adjustment per lb/week weight change (used in TDEE inference)
export const CALORIES_PER_G_PROTEIN = 4;
export const CALORIES_PER_G_CARBS = 4;
export const CALORIES_PER_G_FAT = 9;

export const MIN_CALORIES_MALE = 1500;
export const MIN_CALORIES_FEMALE = 1200;
export const MAX_DEFICIT = 1000;
export const MAX_SURPLUS = 500;

export const MIN_DATA_DAYS = 7;
export const MATURE_DATA_DAYS = 28;
export const MAX_DAILY_TDEE_CHANGE = 75;
export const WEIGHT_TREND_DAYS = 11;
export const INTAKE_AVERAGE_DAYS = 11;
export const EWMA_SMOOTHING_FACTOR = 0.1; // α for weight trend smoothing (10% new data, 90% previous trend)
export const HYBRID_EDGE_DAYS = 5; // Number of days at start/end to use EWMA in hybrid filter
export const HYBRID_WINDOW_DAYS = 5; // Number of days before/after for centered average in hybrid filter

// Macro defaults (grams per lb body weight)
export const PROTEIN_G_PER_LB: Record<Goal, number> = {
  lose: 1.0,
  maintain: 0.8,
  gain: 0.9,
};

export const MIN_FAT_G_PER_LB = 0.35;
export const FAT_PERCENT_OF_CALORIES = 0.28;
export const MIN_CARBS_G = 50;

// Unit conversions
export const kgFromLbs = (lbs: number): number => lbs / 2.205;
export const lbsFromKg = (kg: number): number => kg * 2.205;
export const cmFromInches = (inches: number): number => inches * 2.54;
export const cmFromFeet = (feet: number, inches: number): number =>
  (feet * 12 + inches) * 2.54;
