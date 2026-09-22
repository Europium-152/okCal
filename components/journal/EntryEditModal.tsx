import React from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '@/types';

interface EntryEditModalProps {
  visible: boolean;
  entry: FoodEntry | null;
  editQuantity: string;
  editCaloriesPer100: string;
  editProteinPer100: string;
  editCarbsPer100: string;
  editFatPer100: string;
  editDate: string;
  editTime: string;
  onQuantityChange: (value: string) => void;
  onCaloriesPer100Change: (value: string) => void;
  onProteinPer100Change: (value: string) => void;
  onCarbsPer100Change: (value: string) => void;
  onFatPer100Change: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function EntryEditModal({
  visible,
  entry,
  editQuantity,
  editCaloriesPer100,
  editProteinPer100,
  editCarbsPer100,
  editFatPer100,
  editDate,
  editTime,
  onQuantityChange,
  onCaloriesPer100Change,
  onProteinPer100Change,
  onCarbsPer100Change,
  onFatPer100Change,
  onDateChange,
  onTimeChange,
  onSave,
  onCancel,
}: EntryEditModalProps) {
  // Calculate total preview values
  const totalCalories = editQuantity && editCaloriesPer100
    ? Math.round((parseFloat(editCaloriesPer100) * parseFloat(editQuantity)) / 100)
    : 0;
  const totalProtein = editQuantity && editProteinPer100
    ? Math.round((parseFloat(editProteinPer100) * parseFloat(editQuantity)) / 100 * 10) / 10
    : 0;
  const totalCarbs = editQuantity && editCarbsPer100
    ? Math.round((parseFloat(editCarbsPer100) * parseFloat(editQuantity)) / 100 * 10) / 10
    : 0;
  const totalFat = editQuantity && editFatPer100
    ? Math.round((parseFloat(editFatPer100) * parseFloat(editQuantity)) / 100 * 10) / 10
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Food Entry</Text>
            <Text style={styles.modalFoodName}>{entry?.name}</Text>

            {/* Date and Time */}
            <Text style={styles.editSectionTitle}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <Text style={styles.editLabel}>Date</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDate}
                  onChangeText={onDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dateTimeField}>
                <Text style={styles.editLabel}>Time</Text>
                <TextInput
                  style={styles.editInput}
                  value={editTime}
                  onChangeText={onTimeChange}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Quantity */}
            <Text style={styles.editLabel}>Quantity</Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editQuantity}
                onChangeText={onQuantityChange}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.editUnit}>{entry?.unit}</Text>
            </View>

            {/* Preview of Total Values */}
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewLabel}>
                Total for {editQuantity || '0'}{entry?.unit}:
              </Text>
              <View style={styles.totalPreviewRow}>
                <View style={styles.macroItem}>
                  <Ionicons name="flame" size={14} color="#FF6B6B" />
                  <Text style={styles.totalPreviewValue}>
                    {totalCalories} cal
                  </Text>
                </View>
                <Text style={styles.totalPreviewValue}>
                  {totalProtein}g P
                </Text>
                <Text style={styles.totalPreviewValue}>
                  {totalCarbs}g C
                </Text>
                <Text style={styles.totalPreviewValue}>
                  {totalFat}g F
                </Text>
              </View>
            </View>

            {/* Per 100g Values Section */}
            <Text style={styles.editSectionTitle}>Nutritional Values (per 100{entry?.unit})</Text>

            {/* Calories per 100g */}
            <Text style={styles.editLabel}>Calories</Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editCaloriesPer100}
                onChangeText={onCaloriesPer100Change}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.editUnit}>kcal</Text>
            </View>

            {/* Protein per 100g */}
            <Text style={styles.editLabel}>Protein</Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editProteinPer100}
                onChangeText={onProteinPer100Change}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.editUnit}>g</Text>
            </View>

            {/* Carbs per 100g */}
            <Text style={styles.editLabel}>Carbs</Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editCarbsPer100}
                onChangeText={onCarbsPer100Change}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.editUnit}>g</Text>
            </View>

            {/* Fat per 100g */}
            <Text style={styles.editLabel}>Fat</Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editFatPer100}
                onChangeText={onFatPer100Change}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.editUnit}>g</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={onSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: Dimensions.get('window').width - 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  modalFoodName: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
  },
  editSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 10,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateTimeField: {
    flex: 1,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 6,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    padding: 10,
    color: '#333',
  },
  editUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  totalPreview: {
    backgroundColor: '#e6f3ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  totalPreviewLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  totalPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  totalPreviewValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    flexShrink: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
