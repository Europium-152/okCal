import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { deleteFoodEntry, saveFoodEntry } from '@/utils/storage';
import { FoodEntry } from '@/types';
import { getTodayString, parseDate } from '@/utils/dateHelpers';

type ActionMode = 'main' | 'copy' | 'move';

const TIME_PATTERN = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export function useBatchOperations(
  entries: FoodEntry[],
  onComplete: () => void
) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionMode, setActionMode] = useState<ActionMode>('main');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('');
  // Time the dialog opened with; if the user leaves it alone each item keeps its own time of day
  const [initialTime, setInitialTime] = useState('');

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedItems(new Set());
    setActionMode('main');
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);

    // Exit selection mode if no items selected
    if (newSelection.size === 0) {
      exitSelectionMode();
    }
  }, [selectedItems, exitSelectionMode]);

  const handleCardPress = useCallback((id: string) => {
    if (!selectionMode) {
      // Enter selection mode
      setSelectionMode(true);
      setSelectedItems(new Set([id]));
    } else {
      // Toggle selection
      toggleItemSelection(id);
    }
  }, [selectionMode, toggleItemSelection]);

  const handleCopyToNow = useCallback(async () => {
    const now = Date.now();
    const today = getTodayString();

    try {
      for (const id of selectedItems) {
        const entry = entries.find((e) => e.id === id);
        if (entry) {
          const newEntry: FoodEntry = {
            ...entry,
            id: `${entry.id}_copy_${now}`,
            date: today,
            timestamp: now,
          };
          await saveFoodEntry(newEntry);
        }
      }
      onComplete();
      Alert.alert('Success', `Copied ${selectedItems.size} item(s) to today`);
      exitSelectionMode();
    } catch (error) {
      Alert.alert('Error', 'Failed to copy items');
    }
  }, [selectedItems, entries, onComplete, exitSelectionMode]);

  // Defaults the dialog to the date and time of the first selected log
  const openDatePicker = useCallback((fallbackDate: string) => {
    const first = entries.find((e) => selectedItems.has(e.id));
    const time = first ? formatTime(first.timestamp) : '';
    setTargetDate(first?.date ?? fallbackDate);
    setTargetTime(time);
    setInitialTime(time);
    setShowDatePicker(true);
  }, [entries, selectedItems]);

  const handleCopyToDate = openDatePicker;

  const handleMoveToNow = useCallback(async () => {
    const now = Date.now();
    const today = getTodayString();

    try {
      for (const id of selectedItems) {
        const entry = entries.find((e) => e.id === id);
        if (entry) {
          await deleteFoodEntry(id);
          const updatedEntry: FoodEntry = {
            ...entry,
            date: today,
            timestamp: now,
          };
          await saveFoodEntry(updatedEntry);
        }
      }
      onComplete();
      Alert.alert('Success', `Moved ${selectedItems.size} item(s) to now`);
      exitSelectionMode();
    } catch (error) {
      Alert.alert('Error', 'Failed to move items');
    }
  }, [selectedItems, entries, onComplete, exitSelectionMode]);

  const handleMoveToDate = openDatePicker;

  const confirmDateSelection = useCallback(async () => {
    if (!targetDate) {
      Alert.alert('Error', 'Please enter a valid date');
      return;
    }

    if (!targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    if (targetTime && !TIME_PATTERN.test(targetTime)) {
      Alert.alert('Error', 'Please enter time in HH:MM format');
      return;
    }

    // Timestamp for an entry on the target date: the chosen time if the user changed it,
    // otherwise the entry's own time of day
    const timestampFor = (entry: FoodEntry): number => {
      const newDate = parseDate(targetDate);
      if (targetTime && targetTime !== initialTime) {
        const [hours, minutes] = targetTime.split(':').map(Number);
        newDate.setHours(hours, minutes, 0, 0);
      } else {
        const originalDate = new Date(entry.timestamp);
        newDate.setHours(
          originalDate.getHours(),
          originalDate.getMinutes(),
          originalDate.getSeconds(),
          originalDate.getMilliseconds()
        );
      }
      return newDate.getTime();
    };

    try {
      if (actionMode === 'copy') {
        // Copy to date
        for (const id of selectedItems) {
          const entry = entries.find((e) => e.id === id);
          if (entry) {
            const newEntry: FoodEntry = {
              ...entry,
              id: `${entry.id}_copy_${Date.now()}`,
              date: targetDate,
              timestamp: timestampFor(entry),
            };
            await saveFoodEntry(newEntry);
          }
        }
        Alert.alert('Success', `Copied ${selectedItems.size} item(s) to ${targetDate}`);
      } else if (actionMode === 'move') {
        // Move to date
        for (const id of selectedItems) {
          const entry = entries.find((e) => e.id === id);
          if (entry) {
            await deleteFoodEntry(id);
            const updatedEntry: FoodEntry = {
              ...entry,
              date: targetDate,
              timestamp: timestampFor(entry),
            };
            await saveFoodEntry(updatedEntry);
          }
        }
        Alert.alert('Success', `Moved ${selectedItems.size} item(s) to ${targetDate}`);
      }

      onComplete();
      setShowDatePicker(false);
      exitSelectionMode();
    } catch (error) {
      Alert.alert('Error', 'Failed to process items');
    }
  }, [targetDate, targetTime, initialTime, actionMode, selectedItems, entries, onComplete, exitSelectionMode]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.size} selected item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedItems) {
                await deleteFoodEntry(id);
              }
              onComplete();
              Alert.alert('Success', `Deleted ${selectedItems.size} item(s)`);
              exitSelectionMode();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete items');
            }
          },
        },
      ]
    );
  }, [selectedItems, onComplete, exitSelectionMode]);

  return {
    selectionMode,
    selectedItems,
    actionMode,
    showDatePicker,
    targetDate,
    targetTime,
    setActionMode,
    setTargetDate,
    setTargetTime,
    setShowDatePicker,
    toggleItemSelection,
    handleCardPress,
    exitSelectionMode,
    handleCopyToNow,
    handleCopyToDate,
    handleMoveToNow,
    handleMoveToDate,
    handleDelete,
    confirmDateSelection,
  };
}
