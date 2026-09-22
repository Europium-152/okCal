import React from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PhotoFoodInputProps {
  photoContext: string;
  onPhotoContextChange: (text: string) => void;
  onTakePhoto: () => void;
  onSelectPhoto: () => void;
  onCancel: () => void;
}

export default function PhotoFoodInput({
  photoContext,
  onPhotoContextChange,
  onTakePhoto,
  onSelectPhoto,
  onCancel,
}: PhotoFoodInputProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.selectionContainer}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.selectionTitle}>Take or Select Photo</Text>

        {/* Optional Hint Input */}
        <View style={styles.contextContainer}>
          <Text style={styles.contextLabel}>
            Hint (Optional)
          </Text>
          <TextInput
            style={styles.contextInput}
            value={photoContext}
            onChangeText={onPhotoContextChange}
            placeholder="e.g., homemade lasagna, grilled chicken breast"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.contextHint}>
            Provide hints about what's in the photo to help the AI estimate calories more accurately
          </Text>
        </View>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={onTakePhoto}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="camera-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.methodTitle}>Take Photo</Text>
          <Text style={styles.methodDescription}>
            Snap a photo of your meal with your camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={onSelectPhoto}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="images-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.methodTitle}>Choose from Gallery</Text>
          <Text style={styles.methodDescription}>
            Select an existing photo from your library
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
    minHeight: 80,
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
