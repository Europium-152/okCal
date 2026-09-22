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
import { Recipe } from '@/types';

interface RecipeFoodInputProps {
  recipes: Recipe[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onCancel: () => void;
  fuzzyMatch: (text: string, query: string) => boolean;
}

export default function RecipeFoodInput({
  recipes,
  searchQuery,
  onSearchQueryChange,
  onSelectRecipe,
  onCancel,
  fuzzyMatch,
}: RecipeFoodInputProps) {
  const filteredRecipes = recipes.filter(recipe =>
    fuzzyMatch(recipe.name, searchQuery)
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
          <Text style={styles.searchTitle}>My Recipes</Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your recipes..."
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

        {filteredRecipes.length === 0 && (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="book-outline" size={64} color="#ccc" />
            <Text style={styles.emptySearchText}>
              {searchQuery ? 'No matching recipes found' : 'No recipes yet'}
            </Text>
            <Text style={styles.emptySearchSubtext}>
              {searchQuery ? 'Try a different search term' : 'Create recipes in Settings > Recipes'}
            </Text>
          </View>
        )}

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                style={styles.searchResultCard}
                onPress={() => onSelectRecipe(item)}
              >
                <View style={styles.searchResultHeader}>
                  <Text style={styles.searchResultName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={[styles.dataTypeBadge, { backgroundColor: '#9C27B0' }]}>
                    <Text style={styles.dataTypeText}>{item.preparedWeightG}g</Text>
                  </View>
                </View>
                <View style={styles.searchResultNutrients}>
                  <View style={styles.nutrientItem}>
                    <Ionicons name="flame" size={14} color="#FF6B6B" />
                    <Text style={styles.nutrientText}>{item.caloriesPer100} cal</Text>
                  </View>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientText}>P: {item.proteinPer100}g</Text>
                  </View>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientText}>C: {item.carbsPer100}g</Text>
                  </View>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientText}>F: {item.fatPer100}g</Text>
                  </View>
                </View>
                <View style={styles.recipeInfo}>
                  <Ionicons name="restaurant" size={12} color="#666" />
                  <Text style={styles.recipeInfoText}>
                    {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.per100Label}>per 100g</Text>
                </View>
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
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipeInfoText: {
    fontSize: 12,
    color: '#666',
  },
  per100Label: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
