import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEntry, WeightEntry, UserProfile, TDEEEstimate, AppSettings, FastingDay, Recipe } from '@/types';
import { parseDate } from './dateHelpers';

const FOOD_ENTRIES_KEY = '@food_entries';
const WEIGHT_ENTRIES_KEY = '@weight_entries';
const USER_PROFILE_KEY = '@user_profile';
const TDEE_HISTORY_KEY = '@tdee_history';
const APP_SETTINGS_KEY = '@app_settings';
const FASTING_DAYS_KEY = '@fasting_days';
const RECIPES_KEY = '@recipes';
const OPENAI_API_KEY = '@openai_api_key';

// In-memory cache to avoid repeated JSON parsing
let foodEntriesCache: FoodEntry[] | null = null;
let foodEntriesCacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60000; // Cache for 60 seconds - navigation between screens is fast

// Data change notification system
type DataChangeListener = () => void;
const dataChangeListeners: DataChangeListener[] = [];

export const addDataChangeListener = (listener: DataChangeListener): (() => void) => {
  dataChangeListeners.push(listener);
  // Return unsubscribe function
  return () => {
    const index = dataChangeListeners.indexOf(listener);
    if (index > -1) {
      dataChangeListeners.splice(index, 1);
    }
  };
};

const notifyDataChange = () => {
  console.log(`[STORAGE] notifyDataChange - notifying ${dataChangeListeners.length} listeners`);
  dataChangeListeners.forEach(listener => listener());
};

// Food Entries
export const saveFoodEntry = async (entry: FoodEntry): Promise<void> => {
  const startTime = Date.now();
  console.log(`[STORAGE] saveFoodEntry START (id: ${entry.id})`);

  try {
    // Read from AsyncStorage
    const readStart = Date.now();
    const data = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
    console.log(`[STORAGE] saveFoodEntry AsyncStorage read took ${Date.now() - readStart}ms`);

    const parseStart = Date.now();
    const entries = data ? JSON.parse(data) : [];
    console.log(`[STORAGE] saveFoodEntry JSON parse took ${Date.now() - parseStart}ms (${entries.length} existing entries)`);

    entries.push(entry);

    const saveStart = Date.now();
    await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(entries));
    console.log(`[STORAGE] saveFoodEntry AsyncStorage save took ${Date.now() - saveStart}ms`);

    // Invalidate cache
    foodEntriesCache = null;
    console.log(`[STORAGE] saveFoodEntry cache invalidated`);

    // Notify listeners that data has changed (for cancelling ongoing calculations)
    notifyDataChange();

    console.log(`[STORAGE] saveFoodEntry COMPLETE - total ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[STORAGE] Error saving food entry:', error);
    throw error;
  }
};

export const getFoodEntries = async (): Promise<FoodEntry[]> => {
  const startTime = Date.now();
  console.log(`[STORAGE] getFoodEntries START`);

  try {
    // Check in-memory cache first (ultra-fast - no I/O)
    const now = Date.now();
    const cacheAge = now - foodEntriesCacheTimestamp;
    if (foodEntriesCache !== null && cacheAge < CACHE_DURATION_MS) {
      console.log(`[STORAGE] getFoodEntries CACHE HIT (age: ${cacheAge}ms) - took ${Date.now() - startTime}ms`);
      return foodEntriesCache;
    }
    console.log(`[STORAGE] getFoodEntries CACHE MISS (cache age: ${cacheAge}ms)`);

    // Read from local AsyncStorage (fast - no network call)
    console.log(`[STORAGE] getFoodEntries reading from AsyncStorage...`);
    const readStart = Date.now();
    const data = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
    console.log(`[STORAGE] getFoodEntries AsyncStorage read took ${Date.now() - readStart}ms`);

    const parseStart = Date.now();
    const entries = data ? JSON.parse(data) : [];
    console.log(`[STORAGE] getFoodEntries JSON parse took ${Date.now() - parseStart}ms (${entries.length} entries)`);

    // Update in-memory cache
    foodEntriesCache = entries;
    foodEntriesCacheTimestamp = Date.now();

    console.log(`[STORAGE] getFoodEntries COMPLETE (AsyncStorage path) - total ${Date.now() - startTime}ms`);
    return entries;
  } catch (error) {
    console.error('[STORAGE] Error getting food entries:', error);
    // Fallback to local storage on error
    try {
      const data = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

export const getFoodEntriesByDate = async (date: string): Promise<FoodEntry[]> => {
  const startTime = Date.now();
  console.log(`[STORAGE] getFoodEntriesByDate START (date: ${date})`);

  const entries = await getFoodEntries();

  const filterStart = Date.now();
  const filtered = entries.filter(entry => entry.date === date);
  console.log(`[STORAGE] getFoodEntriesByDate filter took ${Date.now() - filterStart}ms (${filtered.length} of ${entries.length} entries matched)`);
  console.log(`[STORAGE] getFoodEntriesByDate COMPLETE - total ${Date.now() - startTime}ms`);

  return filtered;
};

export const deleteFoodEntry = async (id: string): Promise<void> => {
  const startTime = Date.now();
  console.log(`[STORAGE] deleteFoodEntry START (id: ${id})`);

  try {
    // Read from AsyncStorage
    const readStart = Date.now();
    const data = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
    console.log(`[STORAGE] deleteFoodEntry AsyncStorage read took ${Date.now() - readStart}ms`);

    const parseStart = Date.now();
    const entries = data ? JSON.parse(data) : [];
    console.log(`[STORAGE] deleteFoodEntry JSON parse took ${Date.now() - parseStart}ms (${entries.length} entries)`);

    const filterStart = Date.now();
    const filtered = entries.filter(entry => entry.id !== id);
    console.log(`[STORAGE] deleteFoodEntry filter took ${Date.now() - filterStart}ms (${entries.length - filtered.length} deleted)`);

    const saveStart = Date.now();
    await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(filtered));
    console.log(`[STORAGE] deleteFoodEntry AsyncStorage save took ${Date.now() - saveStart}ms`);

    // Invalidate cache
    foodEntriesCache = null;
    console.log(`[STORAGE] deleteFoodEntry cache invalidated`);

    // Notify listeners that data has changed (for cancelling ongoing calculations)
    notifyDataChange();

    console.log(`[STORAGE] deleteFoodEntry COMPLETE - total ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[STORAGE] Error deleting food entry:', error);
    throw error;
  }
};

export const saveFoodEntries = async (entries: FoodEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(entries));

    // Invalidate cache
    foodEntriesCache = null;

  } catch (error) {
    console.error('Error saving food entries:', error);
    throw error;
  }
};

// Weight Entries
export const saveWeightEntry = async (entry: WeightEntry): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(WEIGHT_ENTRIES_KEY);
    const entries = data ? JSON.parse(data) : [];
    entries.push(entry);
    await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(entries));

  } catch (error) {
    console.error('Error saving weight entry:', error);
    throw error;
  }
};

export const getWeightEntries = async (): Promise<WeightEntry[]> => {
  try {
    // Read from local AsyncStorage (fast - no network call)
    const data = await AsyncStorage.getItem(WEIGHT_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting weight entries:', error);
    try {
      const data = await AsyncStorage.getItem(WEIGHT_ENTRIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

export const deleteWeightEntry = async (id: string): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(WEIGHT_ENTRIES_KEY);
    const entries = data ? JSON.parse(data) : [];
    const filtered = entries.filter(entry => entry.id !== id);
    await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(filtered));

  } catch (error) {
    console.error('Error deleting weight entry:', error);
    throw error;
  }
};

export const saveWeightEntries = async (entries: WeightEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(entries));

  } catch (error) {
    console.error('Error saving weight entries:', error);
    throw error;
  }
};

// User Profile
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));

  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    // Read from local AsyncStorage (fast - no network call)
    const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    try {
      const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
};

// TDEE History
export const saveTDEEEstimate = async (estimate: TDEEEstimate): Promise<void> => {
  try {
    const history = await getTDEEHistory();
    // Replace estimate for the same date or add new one
    const filtered = history.filter(e => e.date !== estimate.date);
    filtered.push(estimate);
    // Keep only last 90 days
    const sorted = filtered.sort((a, b) =>
      parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );
    const trimmed = sorted.slice(0, 90);
    await AsyncStorage.setItem(TDEE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving TDEE estimate:', error);
    throw error;
  }
};

export const getTDEEHistory = async (): Promise<TDEEEstimate[]> => {
  try {
    const data = await AsyncStorage.getItem(TDEE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting TDEE history:', error);
    return [];
  }
};

export const getLatestTDEEEstimate = async (): Promise<TDEEEstimate | null> => {
  try {
    const history = await getTDEEHistory();
    if (history.length === 0) return null;
    return history.sort((a, b) =>
      parseDate(b.date).getTime() - parseDate(a.date).getTime()
    )[0];
  } catch (error) {
    console.error('Error getting latest TDEE estimate:', error);
    return null;
  }
};

// TDEE Calculation Cache

interface TDEECache {
  estimate: TDEEEstimate;
  dataHash: string;
  timestamp: number;
}

const TDEE_CACHE_KEY = '@tdee_cache';
const CACHE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year - effectively infinite since hash invalidation handles data changes

/**
 * Generate a simple hash from data to detect changes
 * Uses counts and latest dates from each data source
 */
export const generateTDEEDataHash = (
  profile: UserProfile,
  weightEntries: WeightEntry[],
  foodEntries: FoodEntry[],
  fastingDays: FastingDay[]
): string => {
  // Get today's date string (YYYY-MM-DD format)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Sort entries by timestamp to ensure consistent ordering
  const sortedWeight = [...weightEntries].sort((a, b) => a.timestamp - b.timestamp);
  const sortedFood = [...foodEntries].sort((a, b) => a.timestamp - b.timestamp);
  const sortedFasting = [...fastingDays].sort((a, b) => a.timestamp - b.timestamp);

  // Exclude today's food entries since TDEE calculation excludes them
  const foodExcludingToday = sortedFood.filter(e => e.date !== todayStr);
  const fastingExcludingToday = sortedFasting.filter(e => e.date !== todayStr);

  const parts = [
    // Profile fields that affect TDEE
    profile.heightCm,
    profile.birthDate,
    profile.sex,
    profile.goal,
    profile.goalRatePerWeek,
    profile.targetWeightLbs,
    // Entry counts (excluding today for food/fasting, including today for weight)
    sortedWeight.length,
    foodExcludingToday.length,
    fastingExcludingToday.length,
    // Latest dates (to detect new entries - excluding today for food/fasting)
    sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1].date : '',
    foodExcludingToday.length > 0 ? foodExcludingToday[foodExcludingToday.length - 1].date : '',
    fastingExcludingToday.length > 0 ? fastingExcludingToday[fastingExcludingToday.length - 1].date : '',
    // Sum of ALL values to detect edits anywhere in history (excluding today for food)
    // This ensures editing ANY old entry invalidates the cache
    sortedWeight.reduce((sum, e) => sum + e.weight, 0).toFixed(1),
    foodExcludingToday.reduce((sum, e) => sum + e.calories, 0),
  ];

  const hash = parts.join('|');
  console.log(`[HASH] Generated TDEE hash (excluding today: ${todayStr}): ${hash.substring(0, 50)}...`);
  return hash;
};

/**
 * Get cached TDEE estimate if valid
 */
export const getCachedTDEE = async (
  currentHash: string
): Promise<TDEEEstimate | null> => {
  try {
    const data = await AsyncStorage.getItem(TDEE_CACHE_KEY);
    if (!data) return null;

    const cache: TDEECache = JSON.parse(data);
    const now = Date.now();

    // Check if cache is still valid (hash matches and not expired)
    if (cache.dataHash === currentHash && (now - cache.timestamp) < CACHE_EXPIRY_MS) {
      return cache.estimate;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached TDEE:', error);
    return null;
  }
};

/**
 * Save TDEE estimate to cache
 */
export const saveCachedTDEE = async (
  estimate: TDEEEstimate,
  dataHash: string
): Promise<void> => {
  try {
    const cache: TDEECache = {
      estimate,
      dataHash,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(TDEE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving cached TDEE:', error);
  }
};

// Daily TDEE Cache

interface DailyTDEECache {
  results: Array<{ date: string; tdee: number }>;
  dataHash: string;
  timestamp: number;
  startDate: string;
  endDate: string;
}

const DAILY_TDEE_CACHE_KEY = '@daily_tdee_cache';

/**
 * Get cached daily TDEE results if valid
 */
export const getCachedDailyTDEE = async (
  currentHash: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; tdee: number }> | null> => {
  try {
    const data = await AsyncStorage.getItem(DAILY_TDEE_CACHE_KEY);
    if (!data) {
      console.log(`[CACHE] Daily TDEE cache: no cache found`);
      return null;
    }

    const cache: DailyTDEECache = JSON.parse(data);
    const now = Date.now();

    console.log(`[CACHE] Daily TDEE cache check:`);
    console.log(`  - Current hash: ${currentHash.substring(0, 12)}...`);
    console.log(`  - Cached hash: ${cache.dataHash.substring(0, 12)}...`);
    console.log(`  - Hash match: ${cache.dataHash === currentHash}`);
    console.log(`  - Current range: ${startDate} to ${endDate}`);
    console.log(`  - Cached range: ${cache.startDate} to ${cache.endDate}`);
    console.log(`  - Date range match: ${cache.startDate === startDate && cache.endDate === endDate}`);
    console.log(`  - Age: ${Math.round((now - cache.timestamp) / 1000)}s`);

    // Check if cache is still valid (hash matches, date range matches, not expired)
    if (
      cache.dataHash === currentHash &&
      cache.startDate === startDate &&
      cache.endDate === endDate &&
      (now - cache.timestamp) < CACHE_EXPIRY_MS
    ) {
      console.log(`[CACHE] Daily TDEE cache: HIT`);
      return cache.results;
    }

    console.log(`[CACHE] Daily TDEE cache: MISS`);
    return null;
  } catch (error) {
    console.error('Error getting cached daily TDEE:', error);
    return null;
  }
};

/**
 * Save daily TDEE results to cache
 */
export const saveCachedDailyTDEE = async (
  results: Array<{ date: string; tdee: number }>,
  dataHash: string,
  startDate: string,
  endDate: string
): Promise<void> => {
  try {
    const cache: DailyTDEECache = {
      results,
      dataHash,
      timestamp: Date.now(),
      startDate,
      endDate,
    };
    await AsyncStorage.setItem(DAILY_TDEE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving cached daily TDEE:', error);
  }
};

// Weight Trend Cache

interface WeightTrendCache {
  results: Array<{ date: string; weight: number; trend: number }>;
  dataHash: string;
  timestamp: number;
}

const WEIGHT_TREND_CACHE_KEY = '@weight_trend_cache';

/**
 * Generate hash for weight entries to detect changes
 */
export const generateWeightDataHash = (weightEntries: WeightEntry[]): string => {
  const parts = [
    weightEntries.length,
    // Latest date
    weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].date : '',
    // Sum of recent values to detect edits (last 7 entries)
    weightEntries.slice(-7).reduce((sum, e) => sum + e.weight, 0).toFixed(1),
  ];

  return parts.join('|');
};

/**
 * Get cached weight trend results if valid
 */
export const getCachedWeightTrend = async (
  currentHash: string
): Promise<Array<{ date: string; weight: number; trend: number }> | null> => {
  try {
    const data = await AsyncStorage.getItem(WEIGHT_TREND_CACHE_KEY);
    if (!data) return null;

    const cache: WeightTrendCache = JSON.parse(data);
    const now = Date.now();

    // Check if cache is still valid (hash matches and not expired)
    if (
      cache.dataHash === currentHash &&
      (now - cache.timestamp) < CACHE_EXPIRY_MS
    ) {
      return cache.results;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached weight trend:', error);
    return null;
  }
};

/**
 * Save weight trend results to cache
 */
export const saveCachedWeightTrend = async (
  results: Array<{ date: string; weight: number; trend: number }>,
  dataHash: string
): Promise<void> => {
  try {
    const cache: WeightTrendCache = {
      results,
      dataHash,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(WEIGHT_TREND_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving cached weight trend:', error);
  }
};

// App Settings
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));

  } catch (error) {
    console.error('Error saving app settings:', error);
    throw error;
  }
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    // Read from local AsyncStorage (fast - no network call)
    const data = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    return data ? JSON.parse(data) : { units: 'imperial', foodDatabase: 'US' };
  } catch (error) {
    console.error('Error getting app settings:', error);
    return { units: 'imperial', foodDatabase: 'US' };
  }
};

// Fasting Days
export const saveFastingDay = async (fastingDay: FastingDay): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(FASTING_DAYS_KEY);
    const fastingDays = data ? JSON.parse(data) : [];
    // Check if this date is already marked as fasting
    const exists = fastingDays.find(d => d.date === fastingDay.date);
    if (!exists) {
      fastingDays.push(fastingDay);
      await AsyncStorage.setItem(FASTING_DAYS_KEY, JSON.stringify(fastingDays));
    }
  } catch (error) {
    console.error('Error saving fasting day:', error);
    throw error;
  }
};

export const getFastingDays = async (): Promise<FastingDay[]> => {
  try {
    // Read from local AsyncStorage (fast - no network call)
    const data = await AsyncStorage.getItem(FASTING_DAYS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting fasting days:', error);
    try {
      const data = await AsyncStorage.getItem(FASTING_DAYS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

export const isFastingDay = async (date: string): Promise<boolean> => {
  const fastingDays = await getFastingDays();
  return fastingDays.some(d => d.date === date);
};

export const removeFastingDay = async (date: string): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(FASTING_DAYS_KEY);
    const fastingDays = data ? JSON.parse(data) : [];
    const filtered = fastingDays.filter(d => d.date !== date);
    await AsyncStorage.setItem(FASTING_DAYS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing fasting day:', error);
    throw error;
  }
};

// Recipes
export const saveRecipe = async (recipe: Recipe): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(RECIPES_KEY);
    const recipes = data ? JSON.parse(data) : [];
    const existingIndex = recipes.findIndex(r => r.id === recipe.id);

    if (existingIndex >= 0) {
      // Update existing recipe
      recipes[existingIndex] = recipe;
    } else {
      // Add new recipe
      recipes.push(recipe);
    }

    await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));

  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

export const getRecipes = async (): Promise<Recipe[]> => {
  try {
    // Read from local AsyncStorage (fast - no network call)
    const data = await AsyncStorage.getItem(RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting recipes:', error);
    try {
      const data = await AsyncStorage.getItem(RECIPES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  try {
    const recipes = await getRecipes();
    return recipes.find(r => r.id === id) || null;
  } catch (error) {
    console.error('Error getting recipe by id:', error);
    return null;
  }
};

export const deleteRecipe = async (id: string): Promise<void> => {
  try {
    // Read from AsyncStorage
    const data = await AsyncStorage.getItem(RECIPES_KEY);
    const recipes = data ? JSON.parse(data) : [];
    const filtered = recipes.filter(r => r.id !== id);
    await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

/**
 * Clear all user data from local storage
 * Called when the user chooses to delete all their data
 */
export const clearAllUserData = async (): Promise<void> => {
  try {
    console.log('[STORAGE] Clearing all user data from local storage...');

    const keysToRemove = [
      FOOD_ENTRIES_KEY,
      WEIGHT_ENTRIES_KEY,
      USER_PROFILE_KEY,
      TDEE_HISTORY_KEY,
      APP_SETTINGS_KEY,
      FASTING_DAYS_KEY,
      RECIPES_KEY,
      TDEE_CACHE_KEY,
      DAILY_TDEE_CACHE_KEY,
      WEIGHT_TREND_CACHE_KEY,
    ];

    await AsyncStorage.multiRemove(keysToRemove);

    // Clear in-memory cache
    foodEntriesCache = null;
    foodEntriesCacheTimestamp = 0;

    console.log('[STORAGE] All user data cleared from local storage');
  } catch (error) {
    console.error('[STORAGE] Error clearing user data:', error);
    throw error;
  }
};

// API key (bring your own - stored only on this device)
export const saveOpenAIApiKey = async (apiKey: string): Promise<void> => {
  await AsyncStorage.setItem(OPENAI_API_KEY, apiKey.trim());
};

export const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(OPENAI_API_KEY);
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
};
