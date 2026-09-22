import React from 'react';
import { Colors } from '@/constants/colors';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '@/types';

interface EntryListItemProps {
  entry: FoodEntry;
  isSelected: boolean;
  selectionMode: boolean;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  onEdit: (entry: FoodEntry) => void;
}

export default function EntryListItem({
  entry,
  isSelected,
  selectionMode,
  onPress,
  onLongPress,
  onEdit,
}: EntryListItemProps) {
  return (
    <TouchableOpacity
      key={entry.id}
      onPress={() => onPress(entry.id)}
      onLongPress={() => onLongPress(entry.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.entryCard, isSelected && styles.entryCardSelected]}>
        {/* Top row: Time and Name */}
        <View style={styles.entryTopRow}>
          <Text style={styles.entryTime}>
            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.entryName} numberOfLines={1} ellipsizeMode="tail">
            {entry.name}
          </Text>
        </View>

        {/* Bottom row: Quantity/Edit button, Calories, Macros */}
        <View style={styles.entryBottomRow}>
          <TouchableOpacity
            onPress={() => onEdit(entry)}
            style={[styles.quantityButton, selectionMode && styles.quantityButtonHidden]}
            disabled={selectionMode}
          >
            <Text style={styles.quantityText}>
              {entry.quantity}{entry.unit}
            </Text>
            <Ionicons name="pencil" size={12} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.macrosContainer}>
            <View style={styles.macroItem}>
              <Ionicons name="flame" size={14} color="#FF6B6B" />
              <Text style={styles.macroValue}>{entry.calories} cal</Text>
            </View>

            <Text style={styles.macroValue}>
              {entry.protein !== undefined ? entry.protein : 0}g P
            </Text>

            <Text style={styles.macroValue}>
              {entry.carbs !== undefined ? entry.carbs : 0}g C
            </Text>

            <Text style={styles.macroValue}>
              {entry.fat !== undefined ? entry.fat : 0}g F
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  entryCardSelected: {
    backgroundColor: '#e6f3ff',
    borderColor: Colors.primary,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  entryTime: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    minWidth: 60,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  entryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  quantityButtonHidden: {
    opacity: 0.4,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  macrosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
});
