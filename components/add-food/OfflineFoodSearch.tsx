import React, { useState, useEffect } from 'react';
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
import { OfflineFoodItem, searchOfflineFoods } from '@/services/offlineFoodSearch';
import { FoodDatabase } from '@/types';

interface OfflineFoodSearchProps {
  onSelectFood: (food: OfflineFoodItem) => void;
  onCancel: () => void;
  database?: FoodDatabase;
}

export default function OfflineFoodSearch({
  onSelectFood,
  onCancel,
  database = 'US',
}: OfflineFoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OfflineFoodItem[]>([]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const results = searchOfflineFoods(searchQuery, database);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, database]);

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
          <Text style={styles.searchTitle}>Offline Database</Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search offline database (e.g., chicken, apple)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.searchInfoBanner}>
          <Ionicons name="information-circle" size={16} color="#34C759" />
          <Text style={styles.searchInfoText}>
            Curated database - works without internet connection
          </Text>
        </View>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="text-outline" size={64} color="#ccc" />
            <Text style={styles.emptySearchText}>Type at least 2 characters</Text>
          </View>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptySearchText}>No results found</Text>
            <Text style={styles.emptySearchSubtext}>Try a different search term</Text>
          </View>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.description}-${index}`}
          contentContainerStyle={styles.searchResults}
          renderItem={({ item }) => {
            const calories = item.energy != null ? Math.round(item.energy) : 0;
            const protein = item.protein != null ? item.protein.toFixed(1) : '0.0';
            const carbs = item.carb != null ? item.carb.toFixed(1) : '0.0';
            const fat = item.fat != null ? item.fat.toFixed(1) : '0.0';

            return (
              <TouchableOpacity
                style={styles.foodItem}
                onPress={() => onSelectFood(item)}
              >
                <View style={styles.foodItemContent}>
                  <Text style={styles.foodItemName}>{item.description}</Text>
                  <View style={styles.foodItemNutrients}>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientLabel}>Cal</Text>
                      <Text style={styles.nutrientValue}>{calories}</Text>
                    </View>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientLabel}>P</Text>
                      <Text style={styles.nutrientValue}>{protein}g</Text>
                    </View>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientLabel}>C</Text>
                      <Text style={styles.nutrientValue}>{carbs}g</Text>
                    </View>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientLabel}>F</Text>
                      <Text style={styles.nutrientValue}>{fat}g</Text>
                    </View>
                  </View>
                  <Text style={styles.foodItemNote}>per 100g</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
  },
  backButton: {
    marginRight: 12,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  searchInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1B5E20',
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  searchResults: {
    paddingHorizontal: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  foodItemContent: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  foodItemNutrients: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  nutrientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  nutrientLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  nutrientValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  foodItemNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
