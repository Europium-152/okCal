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

import { UnifiedFoodItem, OFFSearchRegion } from '@/types';

/**
 * User-Agent sent on every Open Food Facts request, per their API guidelines:
 * https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
 * Format: AppName/Version (contact email). Uses the app's contact address,
 * not a personal one.
 */
const OFF_USER_AGENT = 'okCal/1.0.0 (info@okcal.app)';

/**
 * Maps an OFF search region setting to the Open Food Facts country tag used
 * to filter search results, or null to search worldwide with no filter.
 */
export const offCountryTagForRegion = (region: OFFSearchRegion): string | null => {
  switch (region) {
    case 'US':
      return 'en:united-states';
    case 'PT':
      return 'en:portugal';
    case 'WORLD':
      return null;
  }
};

/**
 * Simple per-endpoint-class rate limiter, used to stay under Open Food Facts'
 * documented limits (10 req/min for search, 15 req/min for read/product queries).
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

// OFF limits search queries to 10/min/IP and read (product) queries to 15/min/IP
const offSearchRateLimiter = new RateLimiter(10);
const offReadRateLimiter = new RateLimiter(15);

/**
 * Lookup product information by barcode using the Open Food Facts v3 API
 * @param barcode The barcode number to lookup
 * @returns Product information or null if not found
 */
export const lookupProductByBarcode = async (
  barcode: string
): Promise<ProductInfo | null> => {
  try {
    // Respect rate limits
    await offReadRateLimiter.waitIfNeeded();

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${barcode}.json?` +
      `fields=product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity`,
      {
        headers: {
          'User-Agent': OFF_USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success' || !data.product) {
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
 * Search for foods using the Open Food Facts search-a-licious API.
 *
 * The legacy cgi/search.pl endpoint does unranked full-text matching over the
 * whole world database (so "apple" returns French "pomme" compotes). This one
 * ranks by relevance and lets us restrict by language and country.
 *
 * @param query The search query
 * @param region OFF search region setting; determines the country filter applied.
 *   Defaults to 'US' if not provided. Use offCountryTagForRegion to see the mapping.
 * @returns Array of unified food items from OFF
 */
export const searchOFFFoods = async (
  query: string,
  region: OFFSearchRegion = 'US'
): Promise<UnifiedFoodItem[]> => {
  const countryTag = offCountryTagForRegion(region);
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Respect rate limits
    await offSearchRateLimiter.waitIfNeeded();

    const q = countryTag
      ? `${query.trim()} AND countries_tags:"${countryTag}"`
      : query.trim();

    const response = await fetch(
      `https://search.openfoodfacts.org/search?` +
      `q=${encodeURIComponent(q)}&langs=en&page_size=40&` +
      `fields=code,product_name,brands,nutriments,serving_size,image_url,nutriscore_grade,ecoscore_grade,allergens_tags`,
      {
        headers: {
          'User-Agent': OFF_USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      console.error('OFF API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.hits || data.hits.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const foods: UnifiedFoodItem[] = [];

    for (const product of data.hits) {
      const nutriments = product.nutriments || {};
      const name = product.product_name?.trim();
      if (!name) continue;

      // search-a-licious returns brands as an array
      const brand = Array.isArray(product.brands)
        ? product.brands[0]
        : product.brands || undefined;

      const caloriesPer100g =
        nutriments['energy-kcal_100g'] ||
        nutriments['energy-kcal'] ||
        (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : 0);
      if (!(caloriesPer100g > 0)) continue; // Skip items without calorie data

      // Collapse duplicate listings of the same product
      const key = `${name.toLowerCase()}|${(brand || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const proteinPer100g = nutriments.proteins_100g || nutriments.proteins || 0;
      const carbsPer100g = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
      const fatPer100g = nutriments.fat_100g || nutriments.fat || 0;

      foods.push({
        id: product.code || `off-${name}-${brand || ''}`,
        description: name,
        brandName: brand,
        source: 'OFF' as const,
        calories: Math.round(caloriesPer100g),
        protein: proteinPer100g > 0 ? Math.round(proteinPer100g * 10) / 10 : undefined,
        carbs: carbsPer100g > 0 ? Math.round(carbsPer100g * 10) / 10 : undefined,
        fat: fatPer100g > 0 ? Math.round(fatPer100g * 10) / 10 : undefined,
        servingSize: product.serving_size || undefined,
        imageUrl: product.image_url || undefined,
        nutriScore: product.nutriscore_grade?.toLowerCase() || undefined,
        ecoScore: product.ecoscore_grade?.toLowerCase() || undefined,
        allergens: Array.isArray(product.allergens_tags)
          ? product.allergens_tags.map((t: string) => t.replace(/^en:/, '')).join(', ')
          : undefined,
      });
    }

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
