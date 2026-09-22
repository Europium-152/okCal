import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useBatchOperations } from '../useBatchOperations';
import * as storage from '@/utils/storage';
import * as dateHelpers from '@/utils/dateHelpers';
import { FoodEntry } from '@/types';

// Mock storage functions
jest.mock('@/utils/storage', () => ({
  deleteFoodEntry: jest.fn(),
  saveFoodEntry: jest.fn(),
}));

// Mock dateHelpers
jest.mock('@/utils/dateHelpers', () => ({
  getTodayString: jest.fn(() => '2024-03-15'),
}));

// Create a simple mock for Alert.alert
const mockAlertFn = jest.fn();

// Replace Alert.alert before tests run
beforeAll(() => {
  (Alert as any).alert = mockAlertFn;
});

describe('useBatchOperations', () => {
  const mockAlert = mockAlertFn;
  const mockEntries: FoodEntry[] = [
    {
      id: '1',
      name: 'Food 1',
      quantity: 100,
      unit: 'g',
      calories: 200,
      caloriesPer100: 200,
      timestamp: 1710518400000,
      date: '2024-03-14',
    },
    {
      id: '2',
      name: 'Food 2',
      quantity: 150,
      unit: 'g',
      calories: 300,
      caloriesPer100: 200,
      timestamp: 1710518500000,
      date: '2024-03-14',
    },
    {
      id: '3',
      name: 'Food 3',
      quantity: 200,
      unit: 'g',
      calories: 400,
      caloriesPer100: 200,
      timestamp: 1710518600000,
      date: '2024-03-14',
    },
  ];

  const onCompleteMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (storage.deleteFoodEntry as jest.Mock).mockResolvedValue(undefined);
    (storage.saveFoodEntry as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
      expect(result.current.actionMode).toBe('main');
      expect(result.current.showDatePicker).toBe(false);
      expect(result.current.targetDate).toBe('');
    });
  });

  describe('selection state management', () => {
    it('should toggle item selection', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      expect(result.current.selectedItems.has('1')).toBe(true);

      act(() => {
        result.current.toggleItemSelection('1');
      });

      expect(result.current.selectedItems.has('1')).toBe(false);
    });

    it('should add multiple items to selection', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
        result.current.toggleItemSelection('3');
      });

      expect(result.current.selectedItems.size).toBe(3);
      expect(result.current.selectedItems.has('1')).toBe(true);
      expect(result.current.selectedItems.has('2')).toBe(true);
      expect(result.current.selectedItems.has('3')).toBe(true);
    });

    it('should exit selection mode when last item is deselected', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      expect(result.current.selectionMode).toBe(false);

      act(() => {
        result.current.toggleItemSelection('1');
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
    });

    it('should enter selection mode on card press when not in selection mode', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.handleCardPress('1');
      });

      expect(result.current.selectionMode).toBe(true);
      expect(result.current.selectedItems.has('1')).toBe(true);
    });

    it('should toggle selection on card press when in selection mode', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.handleCardPress('1');
      });

      expect(result.current.selectedItems.has('1')).toBe(true);

      act(() => {
        result.current.handleCardPress('2');
      });

      expect(result.current.selectedItems.has('1')).toBe(true);
      expect(result.current.selectedItems.has('2')).toBe(true);

      act(() => {
        result.current.handleCardPress('1');
      });

      expect(result.current.selectedItems.has('1')).toBe(false);
      expect(result.current.selectedItems.has('2')).toBe(true);
    });

    it('should exit selection mode manually', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.handleCardPress('1');
        result.current.handleCardPress('2');
      });

      expect(result.current.selectionMode).toBe(true);
      expect(result.current.selectedItems.size).toBe(2);

      act(() => {
        result.current.exitSelectionMode();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
      expect(result.current.actionMode).toBe('main');
    });
  });

  describe('handleCopyToNow', () => {
    it('should copy selected items to today', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
      });

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(storage.saveFoodEntry).toHaveBeenCalledTimes(2);
      expect(storage.saveFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Food 1',
          date: '2024-03-15',
        })
      );
      expect(storage.saveFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Food 2',
          date: '2024-03-15',
        })
      );
      expect(onCompleteMock).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Copied 2 item(s) to today');
    });

    it('should create new IDs for copied entries', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      const savedEntry = (storage.saveFoodEntry as jest.Mock).mock.calls[0][0];
      expect(savedEntry.id).toContain('_copy_');
      expect(savedEntry.id).toContain('1');
    });

    it('should exit selection mode after copy', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
    });

    it('should handle copy failure', async () => {
      (storage.saveFoodEntry as jest.Mock).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to copy items');
    });

    it('should handle empty selection gracefully', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(storage.saveFoodEntry).not.toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Copied 0 item(s) to today');
    });
  });

  describe('handleMoveToNow', () => {
    it('should move selected items to today', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
      });

      await act(async () => {
        await result.current.handleMoveToNow();
      });

      expect(storage.deleteFoodEntry).toHaveBeenCalledTimes(2);
      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('1');
      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('2');
      expect(storage.saveFoodEntry).toHaveBeenCalledTimes(2);
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Moved 2 item(s) to now');
    });

    it('should preserve entry ID when moving', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleMoveToNow();
      });

      const savedEntry = (storage.saveFoodEntry as jest.Mock).mock.calls[0][0];
      expect(savedEntry.id).toBe('1');
    });

    it('should exit selection mode after move', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleMoveToNow();
      });

      expect(result.current.selectionMode).toBe(false);
    });

    it('should handle move failure', async () => {
      (storage.deleteFoodEntry as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
      });

      await act(async () => {
        await result.current.handleMoveToNow();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to move items');
    });
  });

  describe('date picker operations', () => {
    it('should show date picker for copy to date', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.handleCopyToDate('2024-03-20');
      });

      expect(result.current.showDatePicker).toBe(true);
      expect(result.current.targetDate).toBe('2024-03-20');
    });

    it('should show date picker for move to date', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.handleMoveToDate('2024-03-25');
      });

      expect(result.current.showDatePicker).toBe(true);
      expect(result.current.targetDate).toBe('2024-03-25');
    });

    it('should allow updating target date', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.setTargetDate('2024-03-20');
      });

      expect(result.current.targetDate).toBe('2024-03-20');
    });

    it('should allow toggling date picker visibility', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.setShowDatePicker(true);
      });

      expect(result.current.showDatePicker).toBe(true);

      act(() => {
        result.current.setShowDatePicker(false);
      });

      expect(result.current.showDatePicker).toBe(false);
    });
  });

  describe('confirmDateSelection', () => {
    it('should show error for empty target date', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter a valid date');
    });

    it('should show error for invalid date format', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.setTargetDate('03/15/2024');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter date in YYYY-MM-DD format');
    });

    it('should copy items to specified date', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.setActionMode('copy');
        result.current.setTargetDate('2024-03-20');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(storage.saveFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2024-03-20',
          name: 'Food 1',
        })
      );
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Copied 1 item(s) to 2024-03-20');
    });

    it('should preserve time of day when copying to date', async () => {
      const originalDate = new Date(mockEntries[0].timestamp);
      const expectedHours = originalDate.getHours();
      const expectedMinutes = originalDate.getMinutes();

      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.setActionMode('copy');
        result.current.setTargetDate('2024-03-20');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      const savedEntry = (storage.saveFoodEntry as jest.Mock).mock.calls[0][0];
      const savedDate = new Date(savedEntry.timestamp);

      expect(savedDate.getHours()).toBe(expectedHours);
      expect(savedDate.getMinutes()).toBe(expectedMinutes);
    });

    it('should move items to specified date', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
        result.current.setActionMode('move');
        result.current.setTargetDate('2024-03-25');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(storage.deleteFoodEntry).toHaveBeenCalledTimes(2);
      expect(storage.saveFoodEntry).toHaveBeenCalledTimes(2);
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Moved 2 item(s) to 2024-03-25');
    });

    it('should close date picker after confirmation', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.setActionMode('copy');
        result.current.setTargetDate('2024-03-20');
        result.current.setShowDatePicker(true);
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(result.current.showDatePicker).toBe(false);
    });

    it('should exit selection mode after date operation', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.setActionMode('copy');
        result.current.setTargetDate('2024-03-20');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
    });

    it('should handle date operation failure', async () => {
      (storage.saveFoodEntry as jest.Mock).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.setActionMode('copy');
        result.current.setTargetDate('2024-03-20');
      });

      await act(async () => {
        await result.current.confirmDateSelection();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to process items');
    });
  });

  describe('handleDelete', () => {
    it('should show confirmation dialog', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
        result.current.handleDelete();
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Items',
        'Are you sure you want to delete 2 selected item(s)?',
        expect.any(Array)
      );
    });

    it('should delete items when confirmed', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
        result.current.handleDelete();
      });

      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(storage.deleteFoodEntry).toHaveBeenCalledTimes(2);
      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('1');
      expect(storage.deleteFoodEntry).toHaveBeenCalledWith('2');
      expect(mockAlert).toHaveBeenCalledWith('Success', 'Deleted 2 item(s)');
    });

    it('should not delete when cancelled', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.handleDelete();
      });

      const alertCall = mockAlert.mock.calls[0];
      const cancelButton = alertCall[2][0];

      act(() => {
        cancelButton.onPress && cancelButton.onPress();
      });

      expect(storage.deleteFoodEntry).not.toHaveBeenCalled();
    });

    it('should exit selection mode after delete', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.handleDelete();
      });

      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(result.current.selectionMode).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
    });

    it('should handle delete failure', async () => {
      (storage.deleteFoodEntry as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.handleDelete();
      });

      const alertCall = mockAlert.mock.calls[0];
      const deleteButton = alertCall[2][1];

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to delete items');
    });
  });

  describe('action mode', () => {
    it('should allow setting action mode', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.setActionMode('copy');
      });

      expect(result.current.actionMode).toBe('copy');

      act(() => {
        result.current.setActionMode('move');
      });

      expect(result.current.actionMode).toBe('move');

      act(() => {
        result.current.setActionMode('main');
      });

      expect(result.current.actionMode).toBe('main');
    });
  });

  describe('edge cases', () => {
    it('should handle operations with non-existent entry IDs', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('999');
      });

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(storage.saveFoodEntry).not.toHaveBeenCalled();
    });

    it('should handle batch operation with all entries selected', async () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        mockEntries.forEach(entry => {
          result.current.toggleItemSelection(entry.id);
        });
      });

      expect(result.current.selectedItems.size).toBe(mockEntries.length);

      await act(async () => {
        await result.current.handleCopyToNow();
      });

      expect(storage.saveFoodEntry).toHaveBeenCalledTimes(mockEntries.length);
    });

    it('should maintain selection across action mode changes', () => {
      const { result } = renderHook(() => useBatchOperations(mockEntries, onCompleteMock));

      act(() => {
        result.current.toggleItemSelection('1');
        result.current.toggleItemSelection('2');
      });

      expect(result.current.selectedItems.size).toBe(2);

      act(() => {
        result.current.setActionMode('copy');
      });

      expect(result.current.selectedItems.size).toBe(2);

      act(() => {
        result.current.setActionMode('move');
      });

      expect(result.current.selectedItems.size).toBe(2);
    });
  });
});
