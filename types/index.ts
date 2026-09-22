export type Sex = 'male' | 'female';

export type Goal = 'lose' | 'maintain' | 'gain';

export type Units = 'metric' | 'imperial';

export type FoodDatabase = 'US' | 'PT';

export interface AppSettings {
  units: Units;
  foodDatabase: FoodDatabase;
}

export interface UserProfile {
  id: string;
  sex: Sex;
  birthDate: string;          // ISO date string
  heightCm: number;
  goal: Goal;
  targetWeightLbs: number;    // Target weight goal
  goalRatePerWeek: number;    // lbs per week (positive for gain, negative for loss)
  createdAt: string;          // ISO datetime string
  updatedAt: string;
}

export interface FoodEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  name: string;
  calories: number; // Total calories for the quantity
  protein?: number; // Total protein for the quantity
  carbs?: number; // Total carbs for the quantity
  fat?: number; // Total fat for the quantity
  quantity: number; // Amount consumed
  unit: 'g' | 'ml'; // Unit of measurement
  // Per 100g/100ml values (for recalculation)
  caloriesPer100: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  timestamp: number;
}

export interface WeightEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  weight: number; // in lbs
  timestamp: number;
}

export interface DailyData {
  date: string;
  totalCalories: number;
  entries: FoodEntry[];
}

export interface FastingDay {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: number;
}

export interface TDEEEstimate {
  date: string;
  formulaTdee: number;
  inferredTdee: number;
  blendedTdee: number;
  confidence: number;
  dataDays: number;
  weightTrend: number;        // lbs per week
  avgIntake: number;
}

export interface NutritionTarget {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tdeeEstimate: number;
  deficitOrSurplus: number;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: 'g' | 'ml';
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  caloriesPer100: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  preparedWeightG: number;  // Total weight of prepared recipe in grams
  // Calculated per-100g values
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  createdAt: string;
  updatedAt: string;
}

// Open Food Facts API response item
export interface OFFFoodItem {
  code: string;              // Barcode
  product_name: string;      // Product name
  brands?: string;           // Brand names
  categories?: string;       // Product categories
  calories: number;          // Per 100g
  protein?: number;          // Per 100g (grams)
  carbs?: number;            // Per 100g (grams)
  fat?: number;              // Per 100g (grams)
  serving_size?: string;     // e.g., "38g"
  image_url?: string;        // Product image URL
  nutriscore_grade?: string; // a-e rating
  ecoscore_grade?: string;   // a-e environmental rating
  allergens?: string;        // Comma-separated allergens
}

// Unified food item from either USDA or OFF
export interface UnifiedFoodItem {
  id: string;                // fdcId (USDA) or barcode (OFF)
  description: string;       // Food name
  brandName?: string;        // Brand name
  source: 'USDA' | 'OFF';   // Data source identifier
  dataType?: string;         // For USDA compatibility (Foundation, Branded, etc.)
  calories: number;          // Per 100g
  protein?: number;          // Per 100g (grams)
  carbs?: number;            // Per 100g (grams)
  fat?: number;              // Per 100g (grams)
  servingSize?: string;      // Serving size description
  imageUrl?: string;         // Product image (OFF only)
  nutriScore?: string;       // NutriScore grade a-e (OFF only)
  ecoScore?: string;         // Eco-Score grade a-e (OFF only)
  allergens?: string;        // Allergen information (OFF only)
}
