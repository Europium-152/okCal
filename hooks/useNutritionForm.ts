import { useState, useEffect } from 'react';
import { calculateNutrition } from '@/utils/nutritionCalculator';

/**
 * Custom hook for managing nutrition form state and calculations
 *
 * Handles:
 * - Food name and quantity
 * - Unit of measurement (g/ml)
 * - Per 100g/100ml nutrition values
 * - Auto-calculated total nutrition values
 *
 * @returns Nutrition form state and setters
 */
export function useNutritionForm() {
  // Basic food info
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');

  // Per 100g/100ml values
  const [caloriesPer100, setCaloriesPer100] = useState('');
  const [proteinPer100, setProteinPer100] = useState('');
  const [carbsPer100, setCarbsPer100] = useState('');
  const [fatPer100, setFatPer100] = useState('');

  // Calculated total values
  const [totalCalories, setTotalCalories] = useState('');
  const [totalProtein, setTotalProtein] = useState('');
  const [totalCarbs, setTotalCarbs] = useState('');
  const [totalFat, setTotalFat] = useState('');

  // Auto-calculate totals when quantity or per100 values change
  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const cal = parseFloat(caloriesPer100) || 0;
    const prot = parseFloat(proteinPer100) || 0;
    const carb = parseFloat(carbsPer100) || 0;
    const f = parseFloat(fatPer100) || 0;

    if (qty > 0 && cal > 0) {
      const nutrition = calculateNutrition(
        { calories: cal, protein: prot || undefined, carbs: carb || undefined, fat: f || undefined },
        qty
      );

      setTotalCalories(nutrition.calories.toString());
      setTotalProtein(nutrition.protein?.toString() || '');
      setTotalCarbs(nutrition.carbs?.toString() || '');
      setTotalFat(nutrition.fat?.toString() || '');
    } else {
      setTotalCalories('');
      setTotalProtein('');
      setTotalCarbs('');
      setTotalFat('');
    }
  }, [quantity, caloriesPer100, proteinPer100, carbsPer100, fatPer100]);

  /**
   * Reset all form values to initial state
   */
  const resetForm = () => {
    setName('');
    setQuantity('100');
    setUnit('g');
    setCaloriesPer100('');
    setProteinPer100('');
    setCarbsPer100('');
    setFatPer100('');
    setTotalCalories('');
    setTotalProtein('');
    setTotalCarbs('');
    setTotalFat('');
  };

  /**
   * Set all nutrition values at once (useful for barcode/search results)
   */
  const setNutritionData = (data: {
    name?: string;
    quantity?: string;
    unit?: 'g' | 'ml';
    caloriesPer100?: string;
    proteinPer100?: string;
    carbsPer100?: string;
    fatPer100?: string;
  }) => {
    if (data.name !== undefined) setName(data.name);
    if (data.quantity !== undefined) setQuantity(data.quantity);
    if (data.unit !== undefined) setUnit(data.unit);
    if (data.caloriesPer100 !== undefined) setCaloriesPer100(data.caloriesPer100);
    if (data.proteinPer100 !== undefined) setProteinPer100(data.proteinPer100);
    if (data.carbsPer100 !== undefined) setCarbsPer100(data.carbsPer100);
    if (data.fatPer100 !== undefined) setFatPer100(data.fatPer100);
  };

  return {
    // Basic info
    name,
    setName,
    quantity,
    setQuantity,
    unit,
    setUnit,

    // Per 100g/ml values
    caloriesPer100,
    setCaloriesPer100,
    proteinPer100,
    setProteinPer100,
    carbsPer100,
    setCarbsPer100,
    fatPer100,
    setFatPer100,

    // Calculated totals (read-only - automatically calculated)
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,

    // Utility functions
    resetForm,
    setNutritionData,
  };
}
