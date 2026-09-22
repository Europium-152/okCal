import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FastingToggleProps {
  isFasting: boolean;
  hasEntries: boolean;
  selectionMode: boolean;
  onMarkAsFasting: () => void;
  onUnmarkFasting: () => void;
}

export default function FastingToggle({
  isFasting,
  hasEntries,
  selectionMode,
  onMarkAsFasting,
  onUnmarkFasting,
}: FastingToggleProps) {
  // Show fasting indicator if it's a fasting day
  if (isFasting) {
    return (
      <View style={styles.fastingIndicator}>
        <Ionicons name="moon" size={20} color="#9b59b6" />
        <Text style={styles.fastingText}>Fasting Day</Text>
        <TouchableOpacity onPress={onUnmarkFasting} style={styles.fastingUndoButton}>
          <Text style={styles.fastingUndoText}>Undo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show "Mark as Fasting" button if there are no entries and not in selection mode
  if (!hasEntries && !selectionMode) {
    return (
      <View style={styles.fastingButtonContainer}>
        <TouchableOpacity onPress={onMarkAsFasting} style={styles.fastingButton}>
          <Ionicons name="moon-outline" size={20} color="#9b59b6" />
          <Text style={styles.fastingButtonText}>Mark as Fasting Day</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Don't render anything if conditions aren't met
  return null;
}

const styles = StyleSheet.create({
  fastingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  fastingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#9b59b6',
  },
  fastingUndoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  fastingUndoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b59b6',
  },
  fastingButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  fastingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  fastingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b59b6',
  },
});
