import React, { useState, useCallback } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  isFastingDay,
  saveFastingDay,
  removeFastingDay
} from '@/utils/storage';
import { FoodEntry, FastingDay } from '@/types';
import { addDays, getTodayString, formatDate, parseDate } from '@/utils/dateHelpers';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import JournalHeader from '@/components/journal/JournalHeader';
import EntryListItem from '@/components/journal/EntryListItem';
import BatchActionBar from '@/components/journal/BatchActionBar';
import FastingToggle from '@/components/journal/FastingToggle';
import EntryEditModal from '@/components/journal/EntryEditModal';
import DatePickerModal from '@/components/journal/DatePickerModal';

export default function Journal() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isFasting, setIsFasting] = useState(false);

  // Edit entry state
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editCaloriesPer100, setEditCaloriesPer100] = useState('');
  const [editProteinPer100, setEditProteinPer100] = useState('');
  const [editCarbsPer100, setEditCarbsPer100] = useState('');
  const [editFatPer100, setEditFatPer100] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Use custom hooks
  const {
    entries,
    refreshing,
    loadEntries,
    onRefresh,
    deleteEntry,
    editEntry,
  } = useJournalEntries(selectedDate);

  const batchOps = useBatchOperations(entries, () => loadEntries());

  // Load entries and fasting status when screen is focused or date changes
  useFocusEffect(
    useCallback(() => {
      console.log(`[JOURNAL] useFocusEffect TRIGGERED (selectedDate: ${selectedDate})`);
      const focusStartTime = Date.now();
      loadEntries().then(async () => {
        console.log(`[JOURNAL] useFocusEffect loadEntries promise resolved - total ${Date.now() - focusStartTime}ms`);

        // Check if this date is marked as a fasting day
        const fastingStart = Date.now();
        const fastingStatus = await isFastingDay(selectedDate);
        console.log(`[JOURNAL] useFocusEffect isFastingDay took ${Date.now() - fastingStart}ms`);
        setIsFasting(fastingStatus);
      });
    }, [selectedDate])
  );

  const handleMarkAsFasting = async () => {
    const fastingDay: FastingDay = {
      id: Date.now().toString(),
      date: selectedDate,
      timestamp: Date.now(),
    };
    await saveFastingDay(fastingDay);
    setIsFasting(true);
  };

  const handleUnmarkFasting = async () => {
    await removeFastingDay(selectedDate);
    setIsFasting(false);
  };

  const handleEditQuantity = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditQuantity(entry.quantity.toString());
    setEditCaloriesPer100(entry.caloriesPer100.toString());
    setEditProteinPer100((entry.proteinPer100 || 0).toString());
    setEditCarbsPer100((entry.carbsPer100 || 0).toString());
    setEditFatPer100((entry.fatPer100 || 0).toString());

    // Set date and time from timestamp
    const entryDate = new Date(entry.timestamp);
    setEditDate(entry.date);
    setEditTime(`${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}`);
  };

  const handleSaveQuantity = async () => {
    if (!editingEntry) return;

    const success = await editEntry(
      editingEntry,
      editQuantity,
      editCaloriesPer100,
      editProteinPer100,
      editCarbsPer100,
      editFatPer100,
      editDate,
      editTime
    );

    if (success) {
      setEditingEntry(null);
      setEditQuantity('');
      setEditCaloriesPer100('');
      setEditProteinPer100('');
      setEditCarbsPer100('');
      setEditFatPer100('');
      setEditDate('');
      setEditTime('');
    }
  };

  const changeDate = (days: number) => {
    const currentDate = parseDate(selectedDate);
    const newDate = addDays(currentDate, days);
    setSelectedDate(formatDate(newDate));
    batchOps.exitSelectionMode();
  };

  // Group entries into meals (1 hour threshold)
  const groupEntriesIntoMeals = (entries: FoodEntry[]) => {
    if (entries.length === 0) return [];

    // Sort by timestamp ascending (earliest first)
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    const meals: FoodEntry[][] = [];
    let currentMeal: FoodEntry[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = sorted[i].timestamp - sorted[i - 1].timestamp;
      const hourInMs = 60 * 60 * 1000;

      if (timeDiff <= hourInMs) {
        // Same meal
        currentMeal.push(sorted[i]);
      } else {
        // New meal
        meals.push(currentMeal);
        currentMeal = [sorted[i]];
      }
    }

    // Don't forget the last meal
    meals.push(currentMeal);

    return meals;
  };

  const meals = groupEntriesIntoMeals(entries);

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalProtein = Math.round(entries.reduce((sum, entry) => sum + (entry.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(entries.reduce((sum, entry) => sum + (entry.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(entries.reduce((sum, entry) => sum + (entry.fat || 0), 0) * 10) / 10;

  const renderMeal = ({ item, index }: { item: FoodEntry[], index: number }) => {
    // Calculate meal totals
    const mealCalories = item.reduce((sum, entry) => sum + entry.calories, 0);
    const mealProtein = Math.round(item.reduce((sum, entry) => sum + (entry.protein || 0), 0) * 10) / 10;
    const mealCarbs = Math.round(item.reduce((sum, entry) => sum + (entry.carbs || 0), 0) * 10) / 10;
    const mealFat = Math.round(item.reduce((sum, entry) => sum + (entry.fat || 0), 0) * 10) / 10;

    return (
      <View style={styles.mealGroup}>
        {/* Meal Summary */}
        <View style={styles.mealSummaryCard}>
          <Text style={styles.mealTitle}>Meal {index + 1}</Text>
          <View style={styles.mealSummaryRow}>
            <View style={styles.macroItem}>
              <Ionicons name="flame" size={14} color="#FF6B6B" />
              <Text style={styles.mealSummaryValue}>{mealCalories} cal</Text>
            </View>
            <Text style={styles.mealSummaryValue}>{mealProtein}g P</Text>
            <Text style={styles.mealSummaryValue}>{mealCarbs}g C</Text>
            <Text style={styles.mealSummaryValue}>{mealFat}g F</Text>
          </View>
        </View>

        {/* Food Entries in this meal */}
        {item.map(entry => (
          <EntryListItem
            key={entry.id}
            entry={entry}
            isSelected={batchOps.selectedItems.has(entry.id)}
            selectionMode={batchOps.selectionMode}
            onPress={batchOps.handleCardPress}
            onLongPress={batchOps.handleCardPress}
            onEdit={handleEditQuantity}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Navigation & Daily Summary */}
      <JournalHeader
        selectedDate={selectedDate}
        onPreviousDay={() => changeDate(-1)}
        onNextDay={() => changeDate(1)}
        onDateSelect={(date) => {
          setSelectedDate(date);
          batchOps.exitSelectionMode();
        }}
        totalCalories={totalCalories}
        totalProtein={totalProtein}
        totalCarbs={totalCarbs}
        totalFat={totalFat}
      />

      {/* Fasting Day Toggle */}
      <FastingToggle
        isFasting={isFasting}
        hasEntries={entries.length > 0}
        selectionMode={batchOps.selectionMode}
        onMarkAsFasting={handleMarkAsFasting}
        onUnmarkFasting={handleUnmarkFasting}
      />

      {/* Food Entries List (Grouped by Meals) */}
      <FlatList
        data={meals}
        renderItem={renderMeal}
        keyExtractor={(item, index) => `meal-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No food entries for this day</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button below to add your first entry
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Add Button */}
      {!batchOps.selectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddFood', { date: selectedDate })}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Selection Mode Action Bar */}
      {batchOps.selectionMode && (
        <BatchActionBar
          actionMode={batchOps.actionMode}
          onSetActionMode={batchOps.setActionMode}
          onCopyToNow={batchOps.handleCopyToNow}
          onCopyToDate={() => batchOps.handleCopyToDate(selectedDate)}
          onMoveToNow={batchOps.handleMoveToNow}
          onMoveToDate={() => batchOps.handleMoveToDate(selectedDate)}
          onDelete={batchOps.handleDelete}
          onCancel={batchOps.exitSelectionMode}
        />
      )}

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={batchOps.showDatePicker}
        title={batchOps.actionMode === 'copy' ? 'Copy to Date' : 'Move to Date'}
        selectedCount={batchOps.selectedItems.size}
        targetDate={batchOps.targetDate}
        onDateChange={batchOps.setTargetDate}
        onConfirm={batchOps.confirmDateSelection}
        onCancel={() => batchOps.setShowDatePicker(false)}
      />

      {/* Edit Entry Modal */}
      <EntryEditModal
        visible={editingEntry !== null}
        entry={editingEntry}
        editQuantity={editQuantity}
        editCaloriesPer100={editCaloriesPer100}
        editProteinPer100={editProteinPer100}
        editCarbsPer100={editCarbsPer100}
        editFatPer100={editFatPer100}
        editDate={editDate}
        editTime={editTime}
        onQuantityChange={setEditQuantity}
        onCaloriesPer100Change={setEditCaloriesPer100}
        onProteinPer100Change={setEditProteinPer100}
        onCarbsPer100Change={setEditCarbsPer100}
        onFatPer100Change={setEditFatPer100}
        onDateChange={setEditDate}
        onTimeChange={setEditTime}
        onSave={handleSaveQuantity}
        onCancel={() => {
          setEditingEntry(null);
          setEditQuantity('');
          setEditCaloriesPer100('');
          setEditProteinPer100('');
          setEditCarbsPer100('');
          setEditFatPer100('');
          setEditDate('');
          setEditTime('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  mealGroup: {
    marginBottom: 16,
  },
  mealSummaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
