import foodDataUS from '../food-databases/minimal_curated_food_data_US.json';
import foodDataPT from '../food-databases/minimal_curated_food_data_PT.json';
import { FoodDatabase } from '@/types';

export interface OfflineFoodItem {
  description: string;
  protein: number;
  fat: number;
  carb: number;
  energy: number;
}

/**
 * Get the appropriate food database based on selection
 */
function getFoodDatabase(database: FoodDatabase) {
  return database === 'PT' ? foodDataPT : foodDataUS;
}

/**
 * Search the offline food database
 * Returns foods that match the search query
 */
export function searchOfflineFoods(query: string, database: FoodDatabase = 'US'): OfflineFoodItem[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const foodData = getFoodDatabase(database);
  const searchTerm = query.toLowerCase().trim();
  const words = searchTerm.split(/\s+/);

  // Filter foods that match the search criteria
  const results = foodData.Foods.filter((food) => {
    const description = food.description.toLowerCase();

    // Check if all search words are in the description
    return words.every(word => description.includes(word));
  });

  // Sort results by relevance
  // Exact matches first, then starts with, then contains
  return results.sort((a, b) => {
    const aDesc = a.description.toLowerCase();
    const bDesc = b.description.toLowerCase();

    // Exact match
    if (aDesc === searchTerm) return -1;
    if (bDesc === searchTerm) return 1;

    // Starts with search term
    if (aDesc.startsWith(searchTerm) && !bDesc.startsWith(searchTerm)) return -1;
    if (!aDesc.startsWith(searchTerm) && bDesc.startsWith(searchTerm)) return 1;

    // Alphabetical for remaining
    return aDesc.localeCompare(bDesc);
  }).slice(0, 50); // Limit to 50 results
}

/**
 * Get all foods (for browsing)
 */
export function getAllFoods(database: FoodDatabase = 'US', limit: number = 100): OfflineFoodItem[] {
  const foodData = getFoodDatabase(database);
  return foodData.Foods.slice(0, limit);
}
