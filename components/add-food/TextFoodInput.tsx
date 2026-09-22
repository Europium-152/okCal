import React from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TextFoodInputProps {
  textDescription: string;
  onTextChange: (text: string) => void;
  onAnalyze: () => void;
  onCancel: () => void;
}

export default function TextFoodInput({
  textDescription,
  onTextChange,
  onAnalyze,
  onCancel,
}: TextFoodInputProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.selectionContainer}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.selectionTitle}>Describe Your Meal</Text>

        {/* Main Description Input */}
        <View style={styles.contextContainer}>
          <Text style={styles.contextLabel}>
            What did you eat? <Text style={{ color: '#FF3B30' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.contextInput, { minHeight: 120 }]}
            value={textDescription}
            onChangeText={onTextChange}
            placeholder="e.g., I had a chicken caesar salad with croutons and parmesan cheese, and a glass of orange juice"
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={styles.contextHint}>
            Describe your meal in detail. Include portion sizes if known (e.g., "large bowl", "2 slices")
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.methodCard, { backgroundColor: '#4CAF50' }]}
          onPress={onAnalyze}
          disabled={!textDescription.trim()}
        >
          <View style={[styles.methodIcon, { backgroundColor: '#fff', borderRadius: 50, padding: 12 }]}>
            <Ionicons name="sparkles" size={40} color="#4CAF50" />
          </View>
          <Text style={[styles.methodTitle, { color: '#fff' }]}>
            Analyze with AI
          </Text>
          <Text style={[styles.methodDescription, { color: '#fff', opacity: 0.9 }]}>
            Get instant calorie and macro estimates
          </Text>
        </TouchableOpacity>

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
  backButton: {
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  contextContainer: {
    marginBottom: 24,
  },
  contextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contextInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  contextHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  methodCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodIcon: {
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cancelLinkButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelLinkText: {
    fontSize: 16,
    color: Colors.primary,
  },
});
