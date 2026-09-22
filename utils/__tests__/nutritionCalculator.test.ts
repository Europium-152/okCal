import {
  calculateNutrition,
  recalculateFoodEntry,
  detectUnit,
  NutritionalValues,
} from '../nutritionCalculator';
import { FoodEntry } from '@/types';

describe('nutritionCalculator', () => {
  describe('calculateNutrition', () => {
    it('should calculate nutrition for 100g correctly', () => {
      const per100: NutritionalValues = {
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
      };

      const result = calculateNutrition(per100, 100);

      expect(result.calories).toBe(200);
      expect(result.protein).toBe(10);
      expect(result.carbs).toBe(30);
      expect(result.fat).toBe(5);
    });

    it('should calculate nutrition for 50g correctly', () => {
      const per100: NutritionalValues = {
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
      };

      const result = calculateNutrition(per100, 50);

      expect(result.calories).toBe(100);
      expect(result.protein).toBe(5);
      expect(result.carbs).toBe(15);
      expect(result.fat).toBe(2.5);
    });

    it('should calculate nutrition for 200g correctly', () => {
      const per100: NutritionalValues = {
        calories: 150,
        protein: 8,
        carbs: 25,
        fat: 4,
      };

      const result = calculateNutrition(per100, 200);

      expect(result.calories).toBe(300);
      expect(result.protein).toBe(16);
      expect(result.carbs).toBe(50);
      expect(result.fat).toBe(8);
    });

    it('should round calories to nearest integer', () => {
      const per100: NutritionalValues = {
        calories: 333,
      };

      const result = calculateNutrition(per100, 50);

      expect(result.calories).toBe(167); // 333 * 0.5 = 166.5, rounded to 167
    });

    it('should round macros to 1 decimal place', () => {
      const per100: NutritionalValues = {
        calories: 100,
        protein: 10.55,
        carbs: 20.77,
        fat: 5.44,
      };

      const result = calculateNutrition(per100, 50);

      expect(result.protein).toBe(5.3); // 10.55 * 0.5 = 5.275, rounded to 5.3
      expect(result.carbs).toBe(10.4); // 20.77 * 0.5 = 10.385, rounded to 10.4
      expect(result.fat).toBe(2.7); // 5.44 * 0.5 = 2.72, rounded to 2.7
    });

    it('should handle optional macros (undefined)', () => {
      const per100: NutritionalValues = {
        calories: 200,
      };

      const result = calculateNutrition(per100, 100);

      expect(result.calories).toBe(200);
      expect(result.protein).toBeUndefined();
      expect(result.carbs).toBeUndefined();
      expect(result.fat).toBeUndefined();
    });

    it('should handle partial macros', () => {
      const per100: NutritionalValues = {
        calories: 200,
        protein: 10,
        carbs: undefined,
        fat: 5,
      };

      const result = calculateNutrition(per100, 100);

      expect(result.calories).toBe(200);
      expect(result.protein).toBe(10);
      expect(result.carbs).toBeUndefined();
      expect(result.fat).toBe(5);
    });

    it('should handle zero quantity', () => {
      const per100: NutritionalValues = {
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
      };

      const result = calculateNutrition(per100, 0);

      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it('should handle very small quantities', () => {
      const per100: NutritionalValues = {
        calories: 500,
        protein: 20,
      };

      const result = calculateNutrition(per100, 1);

      expect(result.calories).toBe(5);
      expect(result.protein).toBe(0.2);
    });

    it('should handle very large quantities', () => {
      const per100: NutritionalValues = {
        calories: 100,
        protein: 10,
      };

      const result = calculateNutrition(per100, 1000);

      expect(result.calories).toBe(1000);
      expect(result.protein).toBe(100);
    });

    it('should handle zero calories', () => {
      const per100: NutritionalValues = {
        calories: 0,
        protein: 5,
      };

      const result = calculateNutrition(per100, 100);

      expect(result.calories).toBe(0);
      expect(result.protein).toBe(5);
    });
  });

  describe('recalculateFoodEntry', () => {
    const mockEntry: FoodEntry = {
      id: '1',
      name: 'Test Food',
      quantity: 100,
      unit: 'g',
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      caloriesPer100: 200,
      proteinPer100: 10,
      carbsPer100: 30,
      fatPer100: 5,
      timestamp: Date.now(),
      date: '2024-03-15',
    };

    it('should recalculate entry for new quantity', () => {
      const result = recalculateFoodEntry(mockEntry, 150);

      expect(result.quantity).toBe(150);
      expect(result.calories).toBe(300);
      expect(result.protein).toBe(15);
      expect(result.carbs).toBe(45);
      expect(result.fat).toBe(7.5);
    });

    it('should preserve original per100 values', () => {
      const result = recalculateFoodEntry(mockEntry, 150);

      expect(result.caloriesPer100).toBe(200);
      expect(result.proteinPer100).toBe(10);
      expect(result.carbsPer100).toBe(30);
      expect(result.fatPer100).toBe(5);
    });

    it('should preserve all other entry properties', () => {
      const result = recalculateFoodEntry(mockEntry, 150);

      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Food');
      expect(result.unit).toBe('g');
      expect(result.timestamp).toBe(mockEntry.timestamp);
      expect(result.date).toBe('2024-03-15');
    });

    it('should handle entry with undefined macros', () => {
      const entryWithoutMacros: FoodEntry = {
        ...mockEntry,
        protein: undefined,
        carbs: undefined,
        fat: undefined,
        proteinPer100: undefined,
        carbsPer100: undefined,
        fatPer100: undefined,
      };

      const result = recalculateFoodEntry(entryWithoutMacros, 150);

      expect(result.calories).toBe(300);
      expect(result.protein).toBeUndefined();
      expect(result.carbs).toBeUndefined();
      expect(result.fat).toBeUndefined();
    });

    it('should handle zero quantity', () => {
      const result = recalculateFoodEntry(mockEntry, 0);

      expect(result.quantity).toBe(0);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it('should handle fractional quantities', () => {
      const result = recalculateFoodEntry(mockEntry, 33.5);

      expect(result.quantity).toBe(33.5);
      expect(result.calories).toBe(67); // 200 * 0.335 = 67
      expect(result.protein).toBe(3.4); // 10 * 0.335 = 3.35, rounded to 3.4
    });
  });

  describe('detectUnit', () => {
    it('should return "ml" for servingSize with "ml"', () => {
      expect(detectUnit('250ml')).toBe('ml');
      expect(detectUnit('100 ml')).toBe('ml');
      expect(detectUnit('ML')).toBe('ml');
    });

    it('should return "ml" for servingSize with "fluid"', () => {
      expect(detectUnit('8 fluid oz')).toBe('ml');
      expect(detectUnit('Fluid')).toBe('ml');
    });

    it('should return "ml" for servingSize with "liquid"', () => {
      expect(detectUnit('liquid')).toBe('ml');
      expect(detectUnit('250 Liquid')).toBe('ml');
    });

    it('should return "g" for servingSize with "g"', () => {
      expect(detectUnit('100g')).toBe('g');
      expect(detectUnit('250 g')).toBe('g');
      expect(detectUnit('G')).toBe('g');
    });

    it('should return "g" for other units', () => {
      expect(detectUnit('1 cup')).toBe('g');
      expect(detectUnit('2 tablespoons')).toBe('g');
      expect(detectUnit('1 serving')).toBe('g');
    });

    it('should return "g" for undefined', () => {
      expect(detectUnit(undefined)).toBe('g');
    });

    it('should return "g" for empty string', () => {
      expect(detectUnit('')).toBe('g');
    });

    it('should be case insensitive', () => {
      expect(detectUnit('250ML')).toBe('ml');
      expect(detectUnit('FLUID')).toBe('ml');
      expect(detectUnit('LIQUID')).toBe('ml');
    });

    it('should handle mixed case', () => {
      expect(detectUnit('250mL')).toBe('ml');
      expect(detectUnit('FluID OZ')).toBe('ml');
    });

    it('should detect ml even when combined with other text', () => {
      expect(detectUnit('250ml bottle')).toBe('ml');
      expect(detectUnit('contains 100ml of liquid')).toBe('ml');
    });
  });
});
