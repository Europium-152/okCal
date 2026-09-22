export interface ProductInfo {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: string;
  brand?: string;
}

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

import { UnifiedFoodItem } from '@/types';

/**
 * Rate limiter for Open Food Facts API
 * OFF limits search requests to 10 per minute
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minInterval: number;

  constructor(requestsPerMinute: number) {
    this.minInterval = (60 * 1000) / requestsPerMinute;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// OFF API rate limiter (10 requests per minute)
const offRateLimiter = new RateLimiter(10);

/**
 * Lookup product information by barcode using Open Food Facts API
 * @param barcode The barcode number to lookup
 * @returns Product information or null if not found
 */
export const lookupProductByBarcode = async (
  barcode: string
): Promise<ProductInfo | null> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Extract product name
    const name =
      product.product_name ||
      product.product_name_en ||
      product.generic_name ||
      'Unknown Product';

    // Get nutritional values per 100g
    const caloriesPer100g =
      nutriments['energy-kcal_100g'] ||
      nutriments['energy-kcal'] ||
      nutriments.energy_100g / 4.184 || // Convert kJ to kcal if needed
      0;

    const proteinPer100g = nutriments.proteins_100g || nutriments.proteins || 0;
    const carbsPer100g =
      nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
    const fatPer100g = nutriments.fat_100g || nutriments.fat || 0;

    // Get serving size information
    const servingSize = product.serving_size || product.serving_quantity || '100g';

    return {
      name,
      calories: Math.round(caloriesPer100g),
      protein: proteinPer100g > 0 ? Math.round(proteinPer100g * 10) / 10 : undefined,
      carbs: carbsPer100g > 0 ? Math.round(carbsPer100g * 10) / 10 : undefined,
      fat: fatPer100g > 0 ? Math.round(fatPer100g * 10) / 10 : undefined,
      servingSize,
      brand: product.brands || undefined,
    };
  } catch (error) {
    console.error('Error looking up product:', error);
    // Re-throw the error so the caller can handle network failures appropriately
    throw error;
  }
};

/**
 * Search for products by name using Open Food Facts API
 * @param query The search query
 * @returns Array of product information
 */
export const searchProductsByName = async (
  query: string
): Promise<ProductInfo[]> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&json=1&page_size=10`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      return [];
    }

    return data.products.map((product: any) => {
      const nutriments = product.nutriments || {};

      const caloriesPer100g =
        nutriments['energy-kcal_100g'] ||
        nutriments['energy-kcal'] ||
        nutriments.energy_100g / 4.184 ||
        0;

      const proteinPer100g =
        nutriments.proteins_100g || nutriments.proteins || 0;
      const carbsPer100g =
        nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
      const fatPer100g = nutriments.fat_100g || nutriments.fat || 0;

      return {
        name:
          product.product_name ||
          product.product_name_en ||
          product.generic_name ||
          'Unknown Product',
        calories: Math.round(caloriesPer100g),
        protein:
          proteinPer100g > 0 ? Math.round(proteinPer100g * 10) / 10 : undefined,
        carbs: carbsPer100g > 0 ? Math.round(carbsPer100g * 10) / 10 : undefined,
        fat: fatPer100g > 0 ? Math.round(fatPer100g * 10) / 10 : undefined,
        servingSize: product.serving_size || product.serving_quantity || '100g',
        brand: product.brands || undefined,
      };
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};


/**
 * Search for foods using Open Food Facts API
 * @param query The search query
 * @returns Array of unified food items from OFF
 */
export const searchOFFFoods = async (
  query: string
): Promise<UnifiedFoodItem[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Respect rate limits
    await offRateLimiter.waitIfNeeded();

    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?` +
      `search_terms=${encodeURIComponent(query)}&` +
      `search_simple=1&action=process&json=1&page_size=20&` +
      `fields=code,product_name,brands,categories,nutriments,image_url,nutriscore_grade,ecoscore_grade,allergens`,
      {
        headers: {
          'User-Agent': 'MacroTracker/1.0 (nutrition.app@example.com)',
        },
      }
    );

    if (!response.ok) {
      console.error('OFF API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      return [];
    }

    const foods = data.products.map((product: any) => {
      const nutriments = product.nutriments || {};

      // Extract calories per 100g
      const caloriesPer100g =
        nutriments['energy-kcal_100g'] ||
        nutriments['energy-kcal'] ||
        (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : 0);

      const proteinPer100g = nutriments.proteins_100g || nutriments.proteins || 0;
      const carbsPer100g = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
      const fatPer100g = nutriments.fat_100g || nutriments.fat || 0;

      return {
        id: product.code || `off-${Date.now()}`,
        description: product.product_name || 'Unknown Product',
        brandName: product.brands || undefined,
        source: 'OFF' as const,
        calories: Math.round(caloriesPer100g),
        protein: proteinPer100g > 0 ? Math.round(proteinPer100g * 10) / 10 : undefined,
        carbs: carbsPer100g > 0 ? Math.round(carbsPer100g * 10) / 10 : undefined,
        fat: fatPer100g > 0 ? Math.round(fatPer100g * 10) / 10 : undefined,
        servingSize: product.serving_size || undefined,
        imageUrl: product.image_url || undefined,
        nutriScore: product.nutriscore_grade?.toLowerCase() || undefined,
        ecoScore: product.ecoscore_grade?.toLowerCase() || undefined,
        allergens: product.allergens || undefined,
      };
    }).filter((item: UnifiedFoodItem) => item.calories > 0); // Filter out items without calorie data

    return foods.slice(0, 20);
  } catch (error) {
    console.error('Error searching OFF foods:', error);
    return [];
  }
};

/**
 * Convert USDA food items to unified format
 * @param usdaItems Array of USDA food items
 * @returns Array of unified food items
 */
export const convertUSDAToUnified = (usdaItems: USDAFoodItem[]): UnifiedFoodItem[] => {
  return usdaItems.map((item) => ({
    id: item.fdcId.toString(),
    description: item.description,
    brandName: item.brandName,
    source: 'USDA' as const,
    dataType: item.dataType,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
  }));
};
