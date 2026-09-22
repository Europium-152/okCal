import { FoodEntry } from '@/types';

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
