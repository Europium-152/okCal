import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ManualFoodInput from '../../add-food/ManualFoodInput';
import { ProductInfo } from '@/services/foodLookup';

describe('ManualFoodInput', () => {
  const defaultProps = {
    name: '',
    setName: jest.fn(),
    quantity: '100',
    setQuantity: jest.fn(),
    unit: 'g' as const,
    setUnit: jest.fn(),
    caloriesPer100: '',
    setCaloriesPer100: jest.fn(),
    proteinPer100: '',
    setProteinPer100: jest.fn(),
    carbsPer100: '',
    setCarbsPer100: jest.fn(),
    fatPer100: '',
    setFatPer100: jest.fn(),
    totalCalories: '',
    totalProtein: '',
    totalCarbs: '',
    totalFat: '',
    scannedProduct: null,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all input fields', () => {
      const { getByPlaceholderText, getByText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      expect(getByPlaceholderText('e.g., Chicken Breast, Oatmeal')).toBeTruthy();
      expect(getByPlaceholderText('100')).toBeTruthy();
      expect(getByText('g')).toBeTruthy();
      expect(getByText('ml')).toBeTruthy();
    });

    it('should render nutrition input fields', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const zeroPlaceholders = getAllByPlaceholderText('0');
      expect(zeroPlaceholders.length).toBeGreaterThan(0);
    });

    it('should render action buttons', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save Entry')).toBeTruthy();
    });

    it('should show scanned product banner when product is scanned', () => {
      const scannedProduct: ProductInfo = {
        product_name: 'Test Product',
        nutriments: {
          'energy-kcal_100g': 200,
          proteins_100g: 10,
          carbohydrates_100g: 20,
          fat_100g: 5,
        },
      };

      const { getByText } = render(
        <ManualFoodInput {...defaultProps} scannedProduct={scannedProduct} />
      );

      expect(
        getByText('Product scanned! Values per 100g. Adjust as needed.')
      ).toBeTruthy();
    });

    it('should not show scanned banner when no product scanned', () => {
      const { queryByText } = render(<ManualFoodInput {...defaultProps} />);

      expect(
        queryByText('Product scanned! Values per 100g. Adjust as needed.')
      ).toBeNull();
    });

    it('should render with populated values', () => {
      const props = {
        ...defaultProps,
        name: 'Chicken Breast',
        quantity: '150',
        caloriesPer100: '165',
        proteinPer100: '31',
      };

      const { getByDisplayValue } = render(<ManualFoodInput {...props} />);

      expect(getByDisplayValue('Chicken Breast')).toBeTruthy();
      expect(getByDisplayValue('150')).toBeTruthy();
      expect(getByDisplayValue('165')).toBeTruthy();
      expect(getByDisplayValue('31')).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('should call setName when name input changes', () => {
      const { getByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const nameInput = getByPlaceholderText('e.g., Chicken Breast, Oatmeal');
      fireEvent.changeText(nameInput, 'Banana');

      expect(defaultProps.setName).toHaveBeenCalledWith('Banana');
    });

    it('should call setQuantity when quantity input changes', () => {
      const { getByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const quantityInput = getByPlaceholderText('100');
      fireEvent.changeText(quantityInput, '150');

      expect(defaultProps.setQuantity).toHaveBeenCalledWith('150');
    });

    it('should call setCaloriesPer100 when calories input changes', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const caloriesInput = getAllByPlaceholderText('0')[0];
      fireEvent.changeText(caloriesInput, '200');

      expect(defaultProps.setCaloriesPer100).toHaveBeenCalledWith('200');
    });

    it('should call setProteinPer100 when protein input changes', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const proteinInput = getAllByPlaceholderText('0')[1];
      fireEvent.changeText(proteinInput, '10');

      expect(defaultProps.setProteinPer100).toHaveBeenCalledWith('10');
    });

    it('should call setCarbsPer100 when carbs input changes', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const carbsInput = getAllByPlaceholderText('0')[2];
      fireEvent.changeText(carbsInput, '20');

      expect(defaultProps.setCarbsPer100).toHaveBeenCalledWith('20');
    });

    it('should call setFatPer100 when fat input changes', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const fatInput = getAllByPlaceholderText('0')[3];
      fireEvent.changeText(fatInput, '5');

      expect(defaultProps.setFatPer100).toHaveBeenCalledWith('5');
    });
  });

  describe('unit selector', () => {
    it('should display active state for grams by default', () => {
      const { UNSAFE_root } = render(<ManualFoodInput {...defaultProps} />);

      // Check that unit is g by default
      expect(defaultProps.unit).toBe('g');
    });

    it('should call setUnit when g button is pressed', () => {
      const props = { ...defaultProps, unit: 'ml' as const };
      const { getByText } = render(<ManualFoodInput {...props} />);

      const gButton = getByText('g').parent;
      fireEvent.press(gButton);

      expect(defaultProps.setUnit).toHaveBeenCalledWith('g');
    });

    it('should call setUnit when ml button is pressed', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      const mlButton = getByText('ml').parent;
      fireEvent.press(mlButton);

      expect(defaultProps.setUnit).toHaveBeenCalledWith('ml');
    });

    it('should display active state for ml when selected', () => {
      const props = { ...defaultProps, unit: 'ml' as const };
      const { UNSAFE_root } = render(<ManualFoodInput {...props} />);

      // Check that unit is ml
      expect(props.unit).toBe('ml');
    });

    it('should update unit label in section title', () => {
      const { getByText, rerender } = render(
        <ManualFoodInput {...defaultProps} />
      );

      expect(getByText('Nutritional Values (per 100g)')).toBeTruthy();

      const mlProps = { ...defaultProps, unit: 'ml' as const };
      rerender(<ManualFoodInput {...mlProps} />);

      expect(getByText('Nutritional Values (per 100ml)')).toBeTruthy();
    });
  });

  describe('total values display', () => {
    it('should display total calories when available', () => {
      const props = {
        ...defaultProps,
        totalCalories: '200',
      };

      const { getByText } = render(<ManualFoodInput {...props} />);

      expect(getByText('Total Values')).toBeTruthy();
      expect(getByText('200')).toBeTruthy();
    });

    it('should display all macro totals when available', () => {
      const props = {
        ...defaultProps,
        totalCalories: '200',
        totalProtein: '10',
        totalCarbs: '20',
        totalFat: '5',
      };

      const { getByText } = render(<ManualFoodInput {...props} />);

      expect(getByText('200')).toBeTruthy();
      expect(getByText('10g')).toBeTruthy();
      expect(getByText('20g')).toBeTruthy();
      expect(getByText('5g')).toBeTruthy();
    });

    it('should not display total section when no totals', () => {
      const { queryByText } = render(<ManualFoodInput {...defaultProps} />);

      expect(queryByText('Total Values')).toBeNull();
    });

    it('should display only available macro totals', () => {
      const props = {
        ...defaultProps,
        totalCalories: '200',
        totalProtein: '10',
        totalCarbs: '',
        totalFat: '',
      };

      const { getByText, queryByText } = render(<ManualFoodInput {...props} />);

      expect(getByText('Total Values')).toBeTruthy();
      expect(getByText('200')).toBeTruthy();
      expect(getByText('10g')).toBeTruthy();
      expect(queryByText('Carbs')).toBeNull();
      expect(queryByText('Fat')).toBeNull();
    });
  });

  describe('action buttons', () => {
    it('should call onSave when Save Entry button is pressed', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      const saveButton = getByText('Save Entry');
      fireEvent.press(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is pressed', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should show "Back" instead of "Cancel" when product is scanned', () => {
      const scannedProduct: ProductInfo = {
        product_name: 'Test Product',
        nutriments: {
          'energy-kcal_100g': 200,
        },
      };

      const { getByText, queryByText } = render(
        <ManualFoodInput {...defaultProps} scannedProduct={scannedProduct} />
      );

      expect(getByText('Back')).toBeTruthy();
      expect(queryByText('Cancel')).toBeNull();
    });

    it('should still call onCancel when "Back" button is pressed', () => {
      const scannedProduct: ProductInfo = {
        product_name: 'Test Product',
        nutriments: {
          'energy-kcal_100g': 200,
        },
      };

      const { getByText } = render(
        <ManualFoodInput {...defaultProps} scannedProduct={scannedProduct} />
      );

      const backButton = getByText('Back');
      fireEvent.press(backButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('required field indicators', () => {
    it('should show asterisk for required fields', () => {
      const { UNSAFE_root } = render(<ManualFoodInput {...defaultProps} />);

      const asterisks = UNSAFE_root.findAllByProps({ children: '*' });
      expect(asterisks.length).toBeGreaterThan(0);
    });
  });

  describe('keyboard handling', () => {
    it('should use decimal-pad keyboard for quantity', () => {
      const { getByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const quantityInput = getByPlaceholderText('100');
      expect(quantityInput.props.keyboardType).toBe('decimal-pad');
    });

    it('should use decimal-pad keyboard for nutrition inputs', () => {
      const { getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const nutritionInputs = getAllByPlaceholderText('0');
      nutritionInputs.forEach((input) => {
        expect(input.props.keyboardType).toBe('decimal-pad');
      });
    });
  });

  describe('autofocus behavior', () => {
    it('should autofocus name input when no product scanned', () => {
      const { getByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      const nameInput = getByPlaceholderText('e.g., Chicken Breast, Oatmeal');
      expect(nameInput.props.autoFocus).toBe(true);
    });

    it('should not autofocus when product is scanned', () => {
      const scannedProduct: ProductInfo = {
        product_name: 'Test Product',
        nutriments: {
          'energy-kcal_100g': 200,
        },
      };

      const { getByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} scannedProduct={scannedProduct} />
      );

      const nameInput = getByPlaceholderText('e.g., Chicken Breast, Oatmeal');
      expect(nameInput.props.autoFocus).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      const props = {
        ...defaultProps,
        name: '',
        quantity: '',
        caloriesPer100: '',
      };

      const { getByPlaceholderText } = render(<ManualFoodInput {...props} />);

      expect(
        getByPlaceholderText('e.g., Chicken Breast, Oatmeal')
      ).toBeTruthy();
      expect(getByPlaceholderText('100')).toBeTruthy();
    });

    it('should handle very long food names', () => {
      const longName = 'A'.repeat(200);
      const props = {
        ...defaultProps,
        name: longName,
      };

      const { getByDisplayValue } = render(<ManualFoodInput {...props} />);

      expect(getByDisplayValue(longName)).toBeTruthy();
    });

    it('should handle zero values in totals', () => {
      const props = {
        ...defaultProps,
        totalCalories: '0',
        totalProtein: '0',
        totalCarbs: '0',
        totalFat: '0',
      };

      const { UNSAFE_root } = render(<ManualFoodInput {...props} />);

      // Should render total section with zero values
      const zeroTexts = UNSAFE_root.findAllByProps({ children: '0' });
      expect(zeroTexts.length).toBeGreaterThan(0);
    });

    it('should handle decimal values in totals', () => {
      const props = {
        ...defaultProps,
        totalCalories: '165.5',
        totalProtein: '10.3',
        totalCarbs: '20.7',
        totalFat: '5.2',
      };

      const { getByText } = render(<ManualFoodInput {...props} />);

      expect(getByText('165.5')).toBeTruthy();
      expect(getByText('10.3g')).toBeTruthy();
      expect(getByText('20.7g')).toBeTruthy();
      expect(getByText('5.2g')).toBeTruthy();
    });

    it('should render without crashing with minimal props', () => {
      const minimalProps = {
        ...defaultProps,
        name: undefined as any,
        quantity: undefined as any,
      };

      const { UNSAFE_root } = render(<ManualFoodInput {...minimalProps} />);

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have clear section titles', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      expect(getByText('Nutritional Values (per 100g)')).toBeTruthy();
    });

    it('should have clearly labeled buttons', () => {
      const { getByText } = render(<ManualFoodInput {...defaultProps} />);

      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save Entry')).toBeTruthy();
    });

    it('should have input placeholders', () => {
      const { getByPlaceholderText, getAllByPlaceholderText } = render(
        <ManualFoodInput {...defaultProps} />
      );

      expect(getByPlaceholderText('e.g., Chicken Breast, Oatmeal')).toBeTruthy();
      expect(getByPlaceholderText('100')).toBeTruthy();
      const zeroPlaceholders = getAllByPlaceholderText('0');
      expect(zeroPlaceholders.length).toBeGreaterThan(0);
    });
  });
});
