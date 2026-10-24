import { useState, useEffect, useRef } from 'react';
import { calculateNutrition, formatCalories, formatMacro, resolvePrecise } from '@/utils/nutritionCalculator';
import { parseDecimal } from '@/utils/parseDecimal';

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
  const [caloriesPer100, setCaloriesPer100Raw] = useState('');
  const [proteinPer100, setProteinPer100Raw] = useState('');
  const [carbsPer100, setCarbsPer100Raw] = useState('');
  const [fatPer100, setFatPer100Raw] = useState('');

  // Full-precision per100 values behind the (rounded) text fields, e.g. from a recipe
  const exactPer100 = useRef<Partial<Record<'calories' | 'protein' | 'carbs' | 'fat', number>>>({});

  // Per100 values as numbers, using the exact source value while its field is unedited
  const getPer100 = () => ({
    calories: resolvePrecise(caloriesPer100, exactPer100.current.calories, formatCalories),
    protein: resolvePrecise(proteinPer100, exactPer100.current.protein, formatMacro),
    carbs: resolvePrecise(carbsPer100, exactPer100.current.carbs, formatMacro),
    fat: resolvePrecise(fatPer100, exactPer100.current.fat, formatMacro),
  });

  // Typing in a field discards the exact source value behind it
  const per100Setter = (key: 'calories' | 'protein' | 'carbs' | 'fat', set: (value: string) => void) => (value: string) => {
    delete exactPer100.current[key];
    set(value);
  };
  const setCaloriesPer100 = per100Setter('calories', setCaloriesPer100Raw);
  const setProteinPer100 = per100Setter('protein', setProteinPer100Raw);
  const setCarbsPer100 = per100Setter('carbs', setCarbsPer100Raw);
  const setFatPer100 = per100Setter('fat', setFatPer100Raw);

  // Calculated total values
  const [totalCalories, setTotalCalories] = useState('');
  const [totalProtein, setTotalProtein] = useState('');
  const [totalCarbs, setTotalCarbs] = useState('');
  const [totalFat, setTotalFat] = useState('');

  // Auto-calculate totals when quantity or per100 values change
  useEffect(() => {
    const qty = parseDecimal(quantity) || 0;
    const per100 = getPer100();
    const cal = per100.calories || 0;
    const prot = per100.protein || 0;
    const carb = per100.carbs || 0;
    const f = per100.fat || 0;

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
    setCaloriesPer100Raw('');
    setProteinPer100Raw('');
    setCarbsPer100Raw('');
    setFatPer100Raw('');
    exactPer100.current = {};
    setTotalCalories('');
    setTotalProtein('');
    setTotalCarbs('');
    setTotalFat('');
  };

  /**
   * Set all nutrition values at once (useful for barcode/search results).
   * `exact` carries full-precision per100 values whose rounded text is in `data`;
   * they are used for calculations and saving until the field is edited.
   */
  const setNutritionData = (data: {
    name?: string;
    quantity?: string;
    unit?: 'g' | 'ml';
    caloriesPer100?: string;
    proteinPer100?: string;
    carbsPer100?: string;
    fatPer100?: string;
  }, exact: { caloriesPer100?: number; proteinPer100?: number; carbsPer100?: number; fatPer100?: number } = {}) => {
    exactPer100.current = {
      calories: exact.caloriesPer100,
      protein: exact.proteinPer100,
      carbs: exact.carbsPer100,
      fat: exact.fatPer100,
    };
    if (data.name !== undefined) setName(data.name);
    if (data.quantity !== undefined) setQuantity(data.quantity);
    if (data.unit !== undefined) setUnit(data.unit);
    if (data.caloriesPer100 !== undefined) setCaloriesPer100Raw(data.caloriesPer100);
    if (data.proteinPer100 !== undefined) setProteinPer100Raw(data.proteinPer100);
    if (data.carbsPer100 !== undefined) setCarbsPer100Raw(data.carbsPer100);
    if (data.fatPer100 !== undefined) setFatPer100Raw(data.fatPer100);
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

    getPer100,

    // Utility functions
    resetForm,
    setNutritionData,
  };
}
