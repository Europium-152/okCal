import { renderHook, act } from '@testing-library/react-native';
import { useNutritionForm } from '../useNutritionForm';

describe('useNutritionForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNutritionForm());

    expect(result.current.name).toBe('');
    expect(result.current.quantity).toBe('100');
    expect(result.current.unit).toBe('g');
    expect(result.current.caloriesPer100).toBe('');
    expect(result.current.proteinPer100).toBe('');
    expect(result.current.carbsPer100).toBe('');
    expect(result.current.fatPer100).toBe('');
    expect(result.current.totalCalories).toBe('');
    expect(result.current.totalProtein).toBe('');
    expect(result.current.totalCarbs).toBe('');
    expect(result.current.totalFat).toBe('');
  });

  it('should update name when setName is called', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setName('Banana');
    });

    expect(result.current.name).toBe('Banana');
  });

  it('should update quantity when setQuantity is called', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('150');
    });

    expect(result.current.quantity).toBe('150');
  });

  it('should update unit when setUnit is called', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setUnit('ml');
    });

    expect(result.current.unit).toBe('ml');
  });

  it('should auto-calculate total calories when caloriesPer100 and quantity are set', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setCaloriesPer100('200');
      result.current.setQuantity('100');
    });

    // Wait for useEffect to run
    expect(result.current.totalCalories).toBe('200');
  });

  it('should auto-calculate total calories for different quantities', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setCaloriesPer100('200');
      result.current.setQuantity('150');
    });

    expect(result.current.totalCalories).toBe('300');
  });

  it('should auto-calculate all macros correctly', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('200');
      result.current.setCaloriesPer100('150');
      result.current.setProteinPer100('10');
      result.current.setCarbsPer100('20');
      result.current.setFatPer100('5');
    });

    expect(result.current.totalCalories).toBe('300');
    expect(result.current.totalProtein).toBe('20');
    expect(result.current.totalCarbs).toBe('40');
    expect(result.current.totalFat).toBe('10');
  });

  it('should handle decimal values in calculations', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('50');
      result.current.setCaloriesPer100('100');
      result.current.setProteinPer100('10.5');
    });

    expect(result.current.totalCalories).toBe('50');
    expect(result.current.totalProtein).toBe('5.3'); // 10.5 * 0.5 = 5.25, rounded to 5.3
  });

  it('should clear totals when quantity is zero', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('100');
      result.current.setCaloriesPer100('200');
    });

    expect(result.current.totalCalories).toBe('200');

    act(() => {
      result.current.setQuantity('0');
    });

    expect(result.current.totalCalories).toBe('');
  });

  it('should clear totals when caloriesPer100 is zero', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('100');
      result.current.setCaloriesPer100('200');
    });

    expect(result.current.totalCalories).toBe('200');

    act(() => {
      result.current.setCaloriesPer100('0');
    });

    expect(result.current.totalCalories).toBe('');
  });

  it('should handle optional macros (protein, carbs, fat)', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('100');
      result.current.setCaloriesPer100('200');
      // Not setting protein, carbs, fat
    });

    expect(result.current.totalCalories).toBe('200');
    expect(result.current.totalProtein).toBe('');
    expect(result.current.totalCarbs).toBe('');
    expect(result.current.totalFat).toBe('');
  });

  it('should reset form to initial state', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setName('Test Food');
      result.current.setQuantity('150');
      result.current.setUnit('ml');
      result.current.setCaloriesPer100('200');
      result.current.setProteinPer100('10');
    });

    expect(result.current.name).toBe('Test Food');

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.name).toBe('');
    expect(result.current.quantity).toBe('100');
    expect(result.current.unit).toBe('g');
    expect(result.current.caloriesPer100).toBe('');
    expect(result.current.proteinPer100).toBe('');
    expect(result.current.totalCalories).toBe('');
    expect(result.current.totalProtein).toBe('');
  });

  it('should set nutrition data with setNutritionData', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setNutritionData({
        name: 'Apple',
        quantity: '150',
        unit: 'g',
        caloriesPer100: '52',
        proteinPer100: '0.3',
        carbsPer100: '14',
        fatPer100: '0.2',
      });
    });

    expect(result.current.name).toBe('Apple');
    expect(result.current.quantity).toBe('150');
    expect(result.current.unit).toBe('g');
    expect(result.current.caloriesPer100).toBe('52');
    expect(result.current.proteinPer100).toBe('0.3');
    expect(result.current.carbsPer100).toBe('14');
    expect(result.current.fatPer100).toBe('0.2');
  });

  it('should handle partial data in setNutritionData', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setNutritionData({
        name: 'Partial Food',
        caloriesPer100: '100',
      });
    });

    expect(result.current.name).toBe('Partial Food');
    expect(result.current.caloriesPer100).toBe('100');
    expect(result.current.quantity).toBe('100'); // Should retain default
  });

  it('should auto-calculate after setNutritionData', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setNutritionData({
        quantity: '200',
        caloriesPer100: '100',
        proteinPer100: '5',
      });
    });

    // Auto-calculation should happen
    expect(result.current.totalCalories).toBe('200');
    expect(result.current.totalProtein).toBe('10');
  });

  it('should update calculations when per100 values change', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('100');
      result.current.setCaloriesPer100('100');
    });

    expect(result.current.totalCalories).toBe('100');

    act(() => {
      result.current.setCaloriesPer100('200');
    });

    expect(result.current.totalCalories).toBe('200');
  });

  it('should handle invalid input gracefully', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('abc');
      result.current.setCaloriesPer100('xyz');
    });

    // Should not crash and should show empty totals
    expect(result.current.totalCalories).toBe('');
  });

  it('should handle negative values', () => {
    const { result } = renderHook(() => useNutritionForm());

    act(() => {
      result.current.setQuantity('-100');
      result.current.setCaloriesPer100('200');
    });

    // Negative quantity should result in empty/zero totals
    expect(result.current.totalCalories).toBe('');
  });
});
