import { FoodEntry } from '@/types';
import { parseDecimal } from '@/utils/parseDecimal';

export interface NutritionalValues {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

/**
 * Calculate nutritional values based on quantity
 * @param per100 Values per 100g/100ml
 * @param quantity Quantity in grams or ml
 * @returns Calculated nutritional values
 */
export const calculateNutrition = (
  per100: NutritionalValues,
  quantity: number
): NutritionalValues => {
  const multiplier = quantity / 100;

  return {
    calories: Math.round(per100.calories * multiplier),
    protein: per100.protein ? Math.round(per100.protein * multiplier * 10) / 10 : undefined,
    carbs: per100.carbs ? Math.round(per100.carbs * multiplier * 10) / 10 : undefined,
    fat: per100.fat ? Math.round(per100.fat * multiplier * 10) / 10 : undefined,
  };
};

/** Display formatting: whole calories, macros to 1 decimal. Never used for storage. */
export const formatCalories = (value: number): string => String(Math.round(value));
export const formatMacro = (value: number): string => String(Math.round(value * 10) / 10);

/**
 * Value of a form field that may have been filled from a full-precision source
 * but is shown rounded. While the text still equals the rounded form of the
 * source value it is returned as-is; once the user edits the text, the typed
 * value wins.
 */
export const resolvePrecise = (
  text: string,
  exact: number | undefined,
  format: (value: number) => string
): number => {
  if (exact !== undefined && format(exact) === text.trim()) return exact;
  return parseDecimal(text);
};

/**
 * Recalculate food entry nutrition based on new quantity
 * @param entry The food entry
 * @param newQuantity New quantity
 * @returns Updated food entry
 */
export const recalculateFoodEntry = (
  entry: FoodEntry,
  newQuantity: number
): FoodEntry => {
  const nutrition = calculateNutrition(
    {
      calories: entry.caloriesPer100,
      protein: entry.proteinPer100,
      carbs: entry.carbsPer100,
      fat: entry.fatPer100,
    },
    newQuantity
  );

  return {
    ...entry,
    quantity: newQuantity,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
  };
};

/**
 * Detect unit type from serving size string
 * @param servingSize Serving size string (e.g., "100g", "250ml")
 * @returns Unit type
 */
export const detectUnit = (servingSize?: string): 'g' | 'ml' => {
  if (!servingSize) return 'g';

  const lower = servingSize.toLowerCase();
  if (lower.includes('ml') || lower.includes('fluid') || lower.includes('liquid')) {
    return 'ml';
  }

  return 'g';
};
