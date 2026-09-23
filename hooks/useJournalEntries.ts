import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  getFoodEntriesByDate,
  deleteFoodEntry,
  saveFoodEntry,
} from '@/utils/storage';
import { FoodEntry } from '@/types';

export function useJournalEntries(selectedDate: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    const startTime = Date.now();
    console.log(`[JOURNAL] loadEntries START (date: ${selectedDate})`);

    const fetchStart = Date.now();
    const data = await getFoodEntriesByDate(selectedDate);
    console.log(`[JOURNAL] loadEntries getFoodEntriesByDate took ${Date.now() - fetchStart}ms (${data.length} entries)`);

    // Migrate old entries that don't have quantity fields
    const migrateStart = Date.now();
    const migratedData = data.map(entry => {
      if (!entry.quantity) {
        return {
          ...entry,
          quantity: 100,
          unit: 'g' as const,
          caloriesPer100: entry.calories,
          proteinPer100: entry.protein,
          carbsPer100: entry.carbs,
          fatPer100: entry.fat,
        };
      }
      return entry;
    });
    console.log(`[JOURNAL] loadEntries migration took ${Date.now() - migrateStart}ms`);

    const sortStart = Date.now();
    const sorted = migratedData.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`[JOURNAL] loadEntries sort took ${Date.now() - sortStart}ms`);

    const stateStart = Date.now();
    setEntries(sorted);
    console.log(`[JOURNAL] loadEntries setEntries took ${Date.now() - stateStart}ms`);

    console.log(`[JOURNAL] loadEntries COMPLETE - total ${Date.now() - startTime}ms`);

    return sorted;
  }, [selectedDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEntries();
    } finally {
      setRefreshing(false);
    }
  }, [loadEntries]);

  const deleteEntry = useCallback(async (id: string, name: string) => {
    return new Promise<void>((resolve, reject) => {
      Alert.alert(
        'Delete Entry',
        `Are you sure you want to delete "${name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Cancelled'))
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFoodEntry(id);
                await loadEntries();
                resolve();
              } catch (error) {
                reject(error);
              }
            },
          },
        ]
      );
    });
  }, [loadEntries]);

  const editEntry = useCallback(async (
    editingEntry: FoodEntry,
    editQuantity: string,
    editCaloriesPer100: string,
    editProteinPer100: string,
    editCarbsPer100: string,
    editFatPer100: string,
    editDate: string,
    editTime: string
  ) => {
    const newQty = parseFloat(editQuantity);
    const newCaloriesPer100 = parseFloat(editCaloriesPer100);
    const newProteinPer100 = parseFloat(editProteinPer100);
    const newCarbsPer100 = parseFloat(editCarbsPer100);
    const newFatPer100 = parseFloat(editFatPer100);

    if (isNaN(newQty) || newQty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return false;
    }

    if (isNaN(newCaloriesPer100) || newCaloriesPer100 < 0) {
      Alert.alert('Error', 'Please enter valid calories per 100g');
      return false;
    }

    if (isNaN(newProteinPer100) || newProteinPer100 < 0) {
      Alert.alert('Error', 'Please enter valid protein per 100g');
      return false;
    }

    if (isNaN(newCarbsPer100) || newCarbsPer100 < 0) {
      Alert.alert('Error', 'Please enter valid carbs per 100g');
      return false;
    }

    if (isNaN(newFatPer100) || newFatPer100 < 0) {
      Alert.alert('Error', 'Please enter valid fat per 100g');
      return false;
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(editDate)) {
      Alert.alert('Error', 'Please enter a valid date in format YYYY-MM-DD');
      return false;
    }

    // Validate time format (HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timePattern.test(editTime)) {
      Alert.alert('Error', 'Please enter a valid time in format HH:MM');
      return false;
    }

    // Calculate new timestamp from date and time
    const [hours, minutes] = editTime.split(':').map(Number);
    const newDate = new Date(editDate);
    newDate.setHours(hours, minutes, 0, 0);
    const newTimestamp = newDate.getTime();

    // Create updated entry with new per-100g values and timestamp
    const updatedEntry: FoodEntry = {
      ...editingEntry,
      date: editDate,
      timestamp: newTimestamp,
      quantity: newQty,
      caloriesPer100: newCaloriesPer100,
      proteinPer100: newProteinPer100,
      carbsPer100: newCarbsPer100,
      fatPer100: newFatPer100,
      // Recalculate total values based on new quantity and per-100g values
      calories: Math.round((newCaloriesPer100 * newQty) / 100),
      protein: Math.round((newProteinPer100 * newQty) / 100 * 10) / 10,
      carbs: Math.round((newCarbsPer100 * newQty) / 100 * 10) / 10,
      fat: Math.round((newFatPer100 * newQty) / 100 * 10) / 10,
    };

    await deleteFoodEntry(editingEntry.id);
    await saveFoodEntry(updatedEntry);
    await loadEntries();

    return true;
  }, [loadEntries]);

  return {
    entries,
    refreshing,
    loadEntries,
    onRefresh,
    deleteEntry,
    editEntry,
  };
}
