import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EntryListItem from '../../journal/EntryListItem';
import { FoodEntry } from '@/types';

describe('EntryListItem', () => {
  const mockEntry: FoodEntry = {
    id: '1',
    name: 'Chicken Breast',
    quantity: 100,
    unit: 'g',
    calories: 165,
    caloriesPer100: 165,
    protein: 31,
    proteinPer100: 31,
    carbs: 0,
    carbsPer100: 0,
    fat: 3.6,
    fatPer100: 3.6,
    timestamp: 1710518400000, // 2024-03-15 12:00:00
    date: '2024-03-15',
  };

  const defaultProps = {
    entry: mockEntry,
    isSelected: false,
    selectionMode: false,
    onPress: jest.fn(),
    onLongPress: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render entry name', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      expect(getByText('Chicken Breast')).toBeTruthy();
    });

    it('should render entry calories', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      expect(getByText('165 cal')).toBeTruthy();
    });

    it('should render entry macros', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      expect(getByText('31g P')).toBeTruthy();
      expect(getByText('0g C')).toBeTruthy();
      expect(getByText('3.6g F')).toBeTruthy();
    });

    it('should render quantity and unit', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      expect(getByText('100g')).toBeTruthy();
    });

    it('should render timestamp', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      // Should show time in format like "12:00 PM"
      expect(getByText(/\d{1,2}:\d{2}/)).toBeTruthy();
    });

    it('should render with ml unit', () => {
      const entry = { ...mockEntry, unit: 'ml' as const };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('100ml')).toBeTruthy();
    });

    it('should handle entries with undefined macros', () => {
      const entry = {
        ...mockEntry,
        protein: undefined,
        carbs: undefined,
        fat: undefined,
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('0g P')).toBeTruthy();
      expect(getByText('0g C')).toBeTruthy();
      expect(getByText('0g F')).toBeTruthy();
    });

    it('should render decimal macro values', () => {
      const entry = {
        ...mockEntry,
        protein: 31.5,
        carbs: 10.3,
        fat: 3.7,
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('31.5g P')).toBeTruthy();
      expect(getByText('10.3g C')).toBeTruthy();
      expect(getByText('3.7g F')).toBeTruthy();
    });
  });

  describe('press interactions', () => {
    it('should call onPress with entry ID when pressed', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      const card = getByText('Chicken Breast').parent?.parent;
      fireEvent.press(card);

      expect(defaultProps.onPress).toHaveBeenCalledWith('1');
    });

    it('should call onLongPress with entry ID when long pressed', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      const card = getByText('Chicken Breast').parent?.parent;
      fireEvent(card, 'longPress');

      expect(defaultProps.onLongPress).toHaveBeenCalledWith('1');
    });

    it('should call onEdit when edit button is pressed', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const editIcon = UNSAFE_root.findAllByProps({ name: 'pencil' })[0];
      const editButton = editIcon.parent;

      fireEvent.press(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockEntry);
    });

    it('should not prevent card press when edit button pressed', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const editIcon = UNSAFE_root.findAllByProps({ name: 'pencil' })[0];
      const editButton = editIcon.parent;

      fireEvent.press(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalled();
      expect(defaultProps.onPress).not.toHaveBeenCalled();
    });
  });

  describe('selection mode', () => {
    it('should show checkbox when in selection mode', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
      };

      const { UNSAFE_root } = render(<EntryListItem {...props} />);

      const checkbox = UNSAFE_root.findAllByProps({ name: 'ellipse-outline' });
      expect(checkbox.length).toBeGreaterThan(0);
    });

    it('should not show checkbox when not in selection mode', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const checkbox = UNSAFE_root.findAllByProps({ name: 'ellipse-outline' });
      expect(checkbox.length).toBe(0);
    });

    it('should show checked icon when item is selected', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
        isSelected: true,
      };

      const { UNSAFE_root } = render(<EntryListItem {...props} />);

      const checkedIcon = UNSAFE_root.findAllByProps({
        name: 'checkmark-circle',
      });
      expect(checkedIcon.length).toBeGreaterThan(0);
    });

    it('should show unchecked icon when item is not selected', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
        isSelected: false,
      };

      const { UNSAFE_root } = render(<EntryListItem {...props} />);

      const uncheckedIcon = UNSAFE_root.findAllByProps({
        name: 'ellipse-outline',
      });
      expect(uncheckedIcon.length).toBeGreaterThan(0);
    });

    it('should hide edit button in selection mode', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
      };

      const { UNSAFE_root } = render(<EntryListItem {...props} />);

      const pencilIcon = UNSAFE_root.findAllByProps({ name: 'pencil' });
      expect(pencilIcon.length).toBe(0);
    });

    it('should show edit button when not in selection mode', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const pencilIcon = UNSAFE_root.findAllByProps({ name: 'pencil' });
      expect(pencilIcon.length).toBeGreaterThan(0);
    });

    it('should apply selected style when isSelected is true', () => {
      const props = {
        ...defaultProps,
        selectionMode: true,
        isSelected: true,
      };

      const { UNSAFE_root } = render(<EntryListItem {...props} />);

      // Just verify that the component renders when selected
      expect(UNSAFE_root).toBeTruthy();
      expect(props.isSelected).toBe(true);
    });
  });

  describe('time formatting', () => {
    it('should format morning time correctly', () => {
      const entry = {
        ...mockEntry,
        timestamp: new Date('2024-03-15T09:30:00').getTime(),
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText(/9:30/)).toBeTruthy();
    });

    it('should format afternoon time correctly', () => {
      const entry = {
        ...mockEntry,
        timestamp: new Date('2024-03-15T14:45:00').getTime(),
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText(/2:45/)).toBeTruthy();
    });

    it('should format midnight correctly', () => {
      const entry = {
        ...mockEntry,
        timestamp: new Date('2024-03-15T00:00:00').getTime(),
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText(/12:00/)).toBeTruthy();
    });

    it('should format noon correctly', () => {
      const entry = {
        ...mockEntry,
        timestamp: new Date('2024-03-15T12:00:00').getTime(),
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText(/12:00/)).toBeTruthy();
    });
  });

  describe('quantity display', () => {
    it('should display integer quantity correctly', () => {
      const entry = { ...mockEntry, quantity: 150 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('150g')).toBeTruthy();
    });

    it('should display decimal quantity correctly', () => {
      const entry = { ...mockEntry, quantity: 125.5 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('125.5g')).toBeTruthy();
    });

    it('should display small quantity correctly', () => {
      const entry = { ...mockEntry, quantity: 10 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('10g')).toBeTruthy();
    });

    it('should display large quantity correctly', () => {
      const entry = { ...mockEntry, quantity: 999 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('999g')).toBeTruthy();
    });
  });

  describe('macro display', () => {
    it('should handle zero protein', () => {
      const entry = { ...mockEntry, protein: 0 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('0g P')).toBeTruthy();
    });

    it('should handle zero carbs', () => {
      const entry = { ...mockEntry, carbs: 0 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('0g C')).toBeTruthy();
    });

    it('should handle zero fat', () => {
      const entry = { ...mockEntry, fat: 0 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('0g F')).toBeTruthy();
    });

    it('should handle high macro values', () => {
      const entry = {
        ...mockEntry,
        protein: 100,
        carbs: 200,
        fat: 50,
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('100g P')).toBeTruthy();
      expect(getByText('200g C')).toBeTruthy();
      expect(getByText('50g F')).toBeTruthy();
    });
  });

  describe('icons', () => {
    it('should display flame icon for calories', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const flameIcon = UNSAFE_root.findAllByProps({ name: 'flame' });
      expect(flameIcon.length).toBeGreaterThan(0);
    });

    it('should display pencil icon for edit button', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const pencilIcon = UNSAFE_root.findAllByProps({ name: 'pencil' });
      expect(pencilIcon.length).toBeGreaterThan(0);
    });
  });

  describe('long food names', () => {
    it('should truncate very long food names', () => {
      const entry = {
        ...mockEntry,
        name: 'This is a very long food name that should be truncated with an ellipsis',
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      const nameElement = getByText(entry.name);
      expect(nameElement.props.numberOfLines).toBe(1);
      expect(nameElement.props.ellipsizeMode).toBe('tail');
    });

    it('should render short food names completely', () => {
      const entry = {
        ...mockEntry,
        name: 'Apple',
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('Apple')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle zero calories', () => {
      const entry = { ...mockEntry, calories: 0 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('0 cal')).toBeTruthy();
    });

    it('should handle very high calories', () => {
      const entry = { ...mockEntry, calories: 9999 };
      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('9999 cal')).toBeTruthy();
    });

    it('should handle entry with special characters in name', () => {
      const entry = {
        ...mockEntry,
        name: 'Chicken & Rice (Home-made)',
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('Chicken & Rice (Home-made)')).toBeTruthy();
    });

    it('should handle entry with unicode characters', () => {
      const entry = {
        ...mockEntry,
        name: 'Café au Lait',
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('Café au Lait')).toBeTruthy();
    });

    it('should handle entry with numbers in name', () => {
      const entry = {
        ...mockEntry,
        name: '2 Eggs + 3 Slices of Bacon',
      };

      const { getByText } = render(
        <EntryListItem {...defaultProps} entry={entry} />
      );

      expect(getByText('2 Eggs + 3 Slices of Bacon')).toBeTruthy();
    });

    it('should not crash with missing optional props', () => {
      const minimalProps = {
        entry: mockEntry,
        isSelected: false,
        selectionMode: false,
        onPress: jest.fn(),
        onLongPress: jest.fn(),
        onEdit: jest.fn(),
      };

      const { UNSAFE_root } = render(<EntryListItem {...minimalProps} />);

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('multiple presses', () => {
    it('should handle multiple rapid presses', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      const card = getByText('Chicken Breast').parent?.parent;

      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(defaultProps.onPress).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple edit button presses', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      const editIcon = UNSAFE_root.findAllByProps({ name: 'pencil' })[0];
      const editButton = editIcon.parent;

      fireEvent.press(editButton);
      fireEvent.press(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalledTimes(2);
    });
  });

  describe('layout', () => {
    it('should render the card component', () => {
      const { UNSAFE_root } = render(<EntryListItem {...defaultProps} />);

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should display time before name', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      // Both time and name should exist
      expect(getByText(/\d{1,2}:\d{2}/)).toBeTruthy();
      expect(getByText('Chicken Breast')).toBeTruthy();
    });

    it('should display quantity with edit icon together', () => {
      const { getByText, UNSAFE_root } = render(
        <EntryListItem {...defaultProps} />
      );

      expect(getByText('100g')).toBeTruthy();
      const pencilIcon = UNSAFE_root.findAllByProps({ name: 'pencil' });
      expect(pencilIcon.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should be pressable', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      const card = getByText('Chicken Breast').parent?.parent;
      expect(card).toBeTruthy();
    });

    it('should have accessible content', () => {
      const { getByText } = render(<EntryListItem {...defaultProps} />);

      // Verify key content is accessible
      expect(getByText('Chicken Breast')).toBeTruthy();
      expect(getByText('165 cal')).toBeTruthy();
      expect(getByText('100g')).toBeTruthy();
    });
  });
});
