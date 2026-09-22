import React from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '@/types';

interface HistoryFoodInputProps {
  historyEntries: FoodEntry[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectEntry: (entry: FoodEntry) => void;
  onCancel: () => void;
  fuzzyMatch: (text: string, query: string) => boolean;
}

export default function HistoryFoodInput({
  historyEntries,
  searchQuery,
  onSearchQueryChange,
  onSelectEntry,
  onCancel,
  fuzzyMatch,
}: HistoryFoodInputProps) {
  const filteredHistory = historyEntries.filter(entry =>
    fuzzyMatch(entry.name, searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.searchTitle}>Search History</Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your previous foods..."
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchQueryChange('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {filteredHistory.length === 0 && (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptySearchText}>
              {searchQuery ? 'No matching foods found' : 'No food history yet'}
            </Text>
            <Text style={styles.emptySearchSubtext}>
              {searchQuery ? 'Try a different search term' : 'Foods you log will appear here'}
            </Text>
          </View>
        )}

        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          renderItem={({ item }) => {
            const displayWeight = `${item.quantity || 0}${item.unit || 'g'}`;
            const lastUsed = new Date(item.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const calories = item.calories || 0;
            const protein = item.protein || 0;
            const carbs = item.carbs || 0;
            const fat = item.fat || 0;

            return (
              <TouchableOpacity
                style={styles.searchResultCard}
                onPress={() => onSelectEntry(item)}
              >
                <View style={styles.searchResultHeader}>
                  <Text style={styles.searchResultName} numberOfLines={2}>
                    {item.name || 'Unknown Food'}
                  </Text>
                  <View style={styles.dataTypeBadge}>
                    <Text style={styles.dataTypeText}>{displayWeight}</Text>
                  </View>
                </View>
                <View style={styles.searchResultNutrients}>
                  <View style={styles.nutrientItem}>
                    <Ionicons name="flame" size={14} color="#FF6B6B" />
                    <Text style={styles.nutrientText}>{calories} cal</Text>
                  </View>
                  {protein > 0 && (
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientText}>P: {protein}g</Text>
                    </View>
                  )}
                  {carbs > 0 && (
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientText}>C: {carbs}g</Text>
                    </View>
                  )}
                  {fat > 0 && (
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientText}>F: {fat}g</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lastUsedText}>Last used: {lastUsed}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  emptySearchContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySearchSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  searchResults: {
    padding: 16,
    paddingTop: 0,
  },
  searchResultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  searchResultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  dataTypeBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dataTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  searchResultNutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  nutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nutrientText: {
    fontSize: 14,
    color: '#666',
  },
  lastUsedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
