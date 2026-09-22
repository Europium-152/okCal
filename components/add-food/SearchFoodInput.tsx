import React from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedFoodItem } from '@/types';

interface SearchFoodInputProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: UnifiedFoodItem[];
  searching: boolean;
  onSelectFood: (food: UnifiedFoodItem) => void;
  onCancel: () => void;
}

export default function SearchFoodInput({
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  onSelectFood,
  onCancel,
}: SearchFoodInputProps) {
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
          <Text style={styles.searchTitle}>Search Foods</Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a food (e.g., chicken, apple)..."
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

        {/* Info Banner */}
        <View style={styles.searchInfoBanner}>
          <Ionicons name="information-circle" size={16} color="#10b981" />
          <Text style={styles.searchInfoText}>
            Searching Open Food Facts - 2M+ products from around the world
          </Text>
        </View>

        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {!searching && searchQuery.length > 0 && searchResults.length === 0 && (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptySearchText}>No results found</Text>
            <Text style={styles.emptySearchSubtext}>Try a different search term</Text>
          </View>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          renderItem={({ item }) => {
            const brandName = item.brandName ? String(item.brandName) : '';
            const description = item.description ? String(item.description) : 'Unknown Food';
            const displayName = brandName
              ? `${brandName} - ${description}`
              : description;

            const calories = typeof item.calories === 'number' ? item.calories : 0;
            const protein = typeof item.protein === 'number' ? item.protein : 0;
            const carbs = typeof item.carbs === 'number' ? item.carbs : 0;
            const fat = typeof item.fat === 'number' ? item.fat : 0;

            return (
              <TouchableOpacity
                style={styles.searchResultCard}
                onPress={() => onSelectFood(item)}
              >
                <View style={styles.searchResultHeader}>
                  <Text style={styles.searchResultName} numberOfLines={2}>
                    {displayName}
                  </Text>
                  {item.brandName && (
                    <View style={styles.brandBadge}>
                      <Ionicons name="pricetag" size={10} color="#10b981" />
                      <Text style={styles.brandBadgeText}>Brand</Text>
                    </View>
                  )}
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
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !searching && searchQuery.length === 0 ? (
              <View style={styles.searchPromptContainer}>
                <Ionicons name="restaurant-outline" size={64} color="#ccc" />
                <Text style={styles.searchPromptText}>
                  Search for common foods
                </Text>
                <Text style={styles.searchPromptSubtext}>
                  Start typing to search 2M+ products from around the world
                </Text>
              </View>
            ) : null
          }
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
  searchInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
  },
  searchingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  searchingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  searchPromptContainer: {
    padding: 40,
    alignItems: 'center',
  },
  searchPromptText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  searchPromptSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46',
  },
  searchResultNutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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
});
