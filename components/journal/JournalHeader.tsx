import React, { useState } from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { formatDisplayDate, parseDate } from '@/utils/dateHelpers';

interface JournalHeaderProps {
  selectedDate: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onDateSelect: (date: string) => void;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export default function JournalHeader({
  selectedDate,
  onPreviousDay,
  onNextDay,
  onDateSelect,
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
}: JournalHeaderProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  return (
    <>
      {/* Date Navigation */}
      <View style={styles.dateContainer}>
        <TouchableOpacity onPress={onPreviousDay} style={styles.dateButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTextContainer}
          onPress={() => setShowCalendar(true)}
        >
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={styles.calendarIcon} />
          </View>
          <Text style={styles.dateSubtext}>
            {parseDate(selectedDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNextDay} style={styles.dateButton}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Daily Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Total</Text>
        <Text style={styles.summaryText}>
          {totalCalories} cal • {totalProtein}g P • {totalCarbs}g C • {totalFat}g F
        </Text>
      </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: Colors.primary },
              }}
              onDayPress={(day) => {
                onDateSelect(day.dateString);
                setShowCalendar(false);
              }}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: '#ffffff',
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dateButton: {
    padding: 8,
  },
  dateTextContainer: {
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarIcon: {
    marginTop: 2,
  },
  dateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
});
