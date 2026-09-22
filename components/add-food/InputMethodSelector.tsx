import React from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type InputMethod = 'select' | 'manual' | 'barcode' | 'search' | 'offline-search' | 'photo' | 'text' | 'history' | 'recipes';

interface InputMethodSelectorProps {
  entryDate: string;
  entryTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onMethodSelect: (method: InputMethod) => void;
  onCancel: () => void;
  onLoadHistory: () => void;
  onLoadRecipes: () => void;
}

export default function InputMethodSelector({
  entryDate,
  entryTime,
  onDateChange,
  onTimeChange,
  onMethodSelect,
  onCancel,
  onLoadHistory,
  onLoadRecipes,
}: InputMethodSelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.selectionContainer}>
        <Text style={styles.selectionTitle}>How would you like to add food?</Text>

        {/* Date and Time Fields */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeField}>
              <Text style={styles.dateTimeLabel}>Date</Text>
              <View style={styles.dateTimeInputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <TextInput
                  style={styles.dateTimeInput}
                  value={entryDate}
                  onChangeText={onDateChange}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <View style={styles.dateTimeField}>
              <Text style={styles.dateTimeLabel}>Time</Text>
              <View style={styles.dateTimeInputContainer}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <TextInput
                  style={styles.dateTimeInput}
                  value={entryTime}
                  onChangeText={onTimeChange}
                  placeholder="HH:MM"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('manual')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="create-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Manual Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => {
              onLoadHistory();
              onMethodSelect('history');
            }}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="time-outline" size={32} color="#FF9500" />
            </View>
            <Text style={styles.gridTitle}>History Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('search')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="globe-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Online Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('offline-search')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="file-tray-full-outline" size={32} color="#34C759" />
            </View>
            <Text style={styles.gridTitle}>Offline Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('barcode')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="barcode-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Scan Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('photo')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="camera-outline" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.gridTitle}>AI Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => onMethodSelect('text')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="chatbox-ellipses-outline" size={32} color="#FF9500" />
            </View>
            <Text style={styles.gridTitle}>AI Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => {
              onLoadRecipes();
              onMethodSelect('recipes');
            }}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="book-outline" size={32} color="#9C27B0" />
            </View>
            <Text style={styles.gridTitle}>My Recipes</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelLinkButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  selectionContainer: {
    padding: 20,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateTimeContainer: {
    marginBottom: 24,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateTimeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  gridCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridIcon: {
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  cancelLinkButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 16,
    color: Colors.primary,
  },
});
