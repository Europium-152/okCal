import React from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ActionMode = 'main' | 'copy' | 'move';

interface BatchActionBarProps {
  actionMode: ActionMode;
  onSetActionMode: (mode: ActionMode) => void;
  onCopyToNow: () => void;
  onCopyToDate: () => void;
  onMoveToNow: () => void;
  onMoveToDate: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BatchActionBar({
  actionMode,
  onSetActionMode,
  onCopyToNow,
  onCopyToDate,
  onMoveToNow,
  onMoveToDate,
  onDelete,
  onCancel,
}: BatchActionBarProps) {
  return (
    <View style={styles.actionBar}>
      {actionMode === 'main' && (
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetActionMode('copy')}
          >
            <Ionicons name="copy-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetActionMode('move')}
          >
            <Ionicons name="move-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Move</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
              Delete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCancel}
          >
            <Ionicons name="close-circle-outline" size={24} color="#666" />
            <Text style={[styles.actionButtonText, { color: '#666' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </>
      )}

      {actionMode === 'copy' && (
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCopyToNow}
          >
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Copy to Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCopyToDate}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Copy to Date</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetActionMode('main')}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#666" />
            <Text style={[styles.actionButtonText, { color: '#666' }]}>
              Back
            </Text>
          </TouchableOpacity>
        </>
      )}

      {actionMode === 'move' && (
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMoveToNow}
          >
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Move to Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMoveToDate}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Move to Date</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetActionMode('main')}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#666" />
            <Text style={[styles.actionButtonText, { color: '#666' }]}>
              Back
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
});
