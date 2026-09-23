import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JournalHeader from '../journal/JournalHeader';

// Mock dateHelpers
jest.mock('@/utils/dateHelpers', () => ({
  parseDate: jest.requireActual('@/utils/dateHelpers').parseDate,
  formatDisplayDate: jest.fn((date: string) => {
    if (date === '2024-03-15') return 'Today';
    if (date === '2024-03-14') return 'Yesterday';
    return 'Mar 10, 2024';
  }),
}));

describe('JournalHeader', () => {
  const defaultProps = {
    selectedDate: '2024-03-15',
    onPreviousDay: jest.fn(),
    onNextDay: jest.fn(),
    totalCalories: 1500,
    totalProtein: 75,
    totalCarbs: 150,
    totalFat: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with all props', () => {
    const { getByText } = render(<JournalHeader {...defaultProps} />);

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Daily Total')).toBeTruthy();
    expect(getByText('1500 cal • 75g P • 150g C • 50g F')).toBeTruthy();
  });

  it('should display correct date text', () => {
    const { getByText } = render(<JournalHeader {...defaultProps} />);

    expect(getByText('Today')).toBeTruthy();
  });

  it('should display formatted full date', () => {
    const { getByText } = render(<JournalHeader {...defaultProps} />);

    // Should display the full date like "March 15, 2024"
    expect(getByText(/March/)).toBeTruthy();
    expect(getByText(/March 15, 2024/)).toBeTruthy();
  });

  it('should display correct nutrition totals', () => {
    const { getByText } = render(<JournalHeader {...defaultProps} />);

    expect(getByText('1500 cal • 75g P • 150g C • 50g F')).toBeTruthy();
  });

  it('should call onPreviousDay when left chevron is pressed', () => {
    const { UNSAFE_root } = render(<JournalHeader {...defaultProps} />);

    const chevronBackIcon = UNSAFE_root.findAllByProps({ name: 'chevron-back' })[0];
    const touchableOpacity = chevronBackIcon.parent;

    fireEvent.press(touchableOpacity);

    expect(defaultProps.onPreviousDay).toHaveBeenCalledTimes(1);
  });

  it('should call onNextDay when right chevron is pressed', () => {
    const { UNSAFE_root } = render(<JournalHeader {...defaultProps} />);

    const chevronForwardIcon = UNSAFE_root.findAllByProps({ name: 'chevron-forward' })[0];
    const touchableOpacity = chevronForwardIcon.parent;

    fireEvent.press(touchableOpacity);

    expect(defaultProps.onNextDay).toHaveBeenCalledTimes(1);
  });

  it('should handle zero values', () => {
    const props = {
      ...defaultProps,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };

    const { getByText } = render(<JournalHeader {...props} />);

    expect(getByText('0 cal • 0g P • 0g C • 0g F')).toBeTruthy();
  });

  it('should handle large values', () => {
    const props = {
      ...defaultProps,
      totalCalories: 5000,
      totalProtein: 250,
      totalCarbs: 500,
      totalFat: 200,
    };

    const { getByText } = render(<JournalHeader {...props} />);

    expect(getByText('5000 cal • 250g P • 500g C • 200g F')).toBeTruthy();
  });

  it('should handle decimal values', () => {
    const props = {
      ...defaultProps,
      totalCalories: 1500,
      totalProtein: 75.5,
      totalCarbs: 150.3,
      totalFat: 50.7,
    };

    const { getByText } = render(<JournalHeader {...props} />);

    expect(getByText('1500 cal • 75.5g P • 150.3g C • 50.7g F')).toBeTruthy();
  });

  it('should render "Yesterday" for previous day', () => {
    const props = {
      ...defaultProps,
      selectedDate: '2024-03-14',
    };

    const { getByText } = render(<JournalHeader {...props} />);

    expect(getByText('Yesterday')).toBeTruthy();
  });

  it('should render specific date for older dates', () => {
    const props = {
      ...defaultProps,
      selectedDate: '2024-03-10',
    };

    const { getByText } = render(<JournalHeader {...props} />);

    expect(getByText('Mar 10, 2024')).toBeTruthy();
  });

  it('should not crash with undefined callbacks', () => {
    const props = {
      ...defaultProps,
      onPreviousDay: undefined as any,
      onNextDay: undefined as any,
    };

    const { UNSAFE_root } = render(<JournalHeader {...props} />);

    // Should render without crashing
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should render both navigation buttons', () => {
    const { UNSAFE_root } = render(<JournalHeader {...defaultProps} />);

    const chevronBack = UNSAFE_root.findAllByProps({ name: 'chevron-back' });
    const chevronForward = UNSAFE_root.findAllByProps({ name: 'chevron-forward' });

    // Should have at least one of each navigation icon
    expect(chevronBack.length).toBeGreaterThanOrEqual(1);
    expect(chevronForward.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow multiple presses of navigation buttons', () => {
    const { UNSAFE_root } = render(<JournalHeader {...defaultProps} />);

    const chevronBackIcon = UNSAFE_root.findAllByProps({ name: 'chevron-back' })[0];
    const backButton = chevronBackIcon.parent;

    const chevronForwardIcon = UNSAFE_root.findAllByProps({ name: 'chevron-forward' })[0];
    const forwardButton = chevronForwardIcon.parent;

    fireEvent.press(backButton);
    fireEvent.press(backButton);
    fireEvent.press(forwardButton);

    expect(defaultProps.onPreviousDay).toHaveBeenCalledTimes(2);
    expect(defaultProps.onNextDay).toHaveBeenCalledTimes(1);
  });
});
