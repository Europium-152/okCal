import React from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductInfo } from '@/services/foodLookup';

interface ManualFoodInputProps {
  // Nutrition form state
  name: string;
  setName: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  unit: 'g' | 'ml';
  setUnit: (value: 'g' | 'ml') => void;
  caloriesPer100: string;
  setCaloriesPer100: (value: string) => void;
  proteinPer100: string;
  setProteinPer100: (value: string) => void;
  carbsPer100: string;
  setCarbsPer100: (value: string) => void;
  fatPer100: string;
  setFatPer100: (value: string) => void;

  // Calculated totals
  totalCalories: string;
  totalProtein: string;
  totalCarbs: string;
  totalFat: string;

  // Scanned product banner
  scannedProduct: ProductInfo | null;

  // Actions
  onSave: () => void;
  onCancel: () => void;
}

export default function ManualFoodInput({
  name,
  setName,
  quantity,
  setQuantity,
  unit,
  setUnit,
  caloriesPer100,
  setCaloriesPer100,
  proteinPer100,
  setProteinPer100,
  carbsPer100,
  setCarbsPer100,
  fatPer100,
  setFatPer100,
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
  scannedProduct,
  onSave,
  onCancel,
}: ManualFoodInputProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {scannedProduct && (
          <View style={styles.scannedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.scannedText}>
              Product scanned! Values per 100g. Adjust as needed.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Food Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chicken Breast, Oatmeal"
              value={name}
              onChangeText={setName}
              autoFocus={!scannedProduct}
            />
          </View>

          {/* Quantity Input */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex2]}>
              <Text style={styles.label}>
                Quantity <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'g' && styles.unitButtonActive]}
                  onPress={() => setUnit('g')}
                >
                  <Text style={[styles.unitButtonText, unit === 'g' && styles.unitButtonTextActive]}>g</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'ml' && styles.unitButtonActive]}
                  onPress={() => setUnit('ml')}
                >
                  <Text style={[styles.unitButtonText, unit === 'ml' && styles.unitButtonTextActive]}>ml</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Nutritional Values (per 100{unit})</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Calories <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={caloriesPer100}
              onChangeText={setCaloriesPer100}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={proteinPer100}
                onChangeText={setProteinPer100}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={carbsPer100}
                onChangeText={setCarbsPer100}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fat (g)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={fatPer100}
              onChangeText={setFatPer100}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Total Values Display */}
          {totalCalories && (
            <>
              <Text style={styles.sectionTitle}>Total Values</Text>
              <View style={styles.totalsContainer}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Calories</Text>
                  <Text style={styles.totalValue}>{totalCalories}</Text>
                </View>
                {totalProtein && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Protein</Text>
                    <Text style={styles.totalValue}>{totalProtein}g</Text>
                  </View>
                )}
                {totalCarbs && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Carbs</Text>
                    <Text style={styles.totalValue}>{totalCarbs}g</Text>
                  </View>
                )}
                {totalFat && (
                  <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Fat</Text>
                    <Text style={styles.totalValue}>{totalFat}g</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>
              {scannedProduct ? 'Back' : 'Cancel'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={onSave}
          >
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  scannedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  scannedText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  unitButtonTextActive: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 8,
  },
  totalsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
