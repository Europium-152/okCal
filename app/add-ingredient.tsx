import React, { useState, useEffect } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { getFoodEntries, getRecipes, getAppSettings } from '@/utils/storage';
import { FoodEntry, Recipe, UnifiedFoodItem, FoodDatabase } from '@/types';
import { lookupProductByBarcode, searchOFFFoods } from '@/services/foodLookup';
import { OfflineFoodItem } from '@/services/offlineFoodSearch';
import OfflineFoodSearch from '@/components/add-food/OfflineFoodSearch';
import * as ImagePicker from 'expo-image-picker';
import { processFoodImage, processFoodDescription, EstimatedFood } from '@/services/aiService';
import BarcodeScanner from '@/components/BarcodeScanner';

type InputMethod = 'select' | 'manual' | 'barcode' | 'search' | 'offline-search' | 'photo' | 'text' | 'history' | 'recipes';

export default function AddIngredient({ navigation, route }: RootStackScreenProps<'AddIngredient'>) {
  const params = route.params || {};
  const recipeId = params.recipeId as string | undefined;
  const [inputMethod, setInputMethod] = useState<InputMethod>('select');
  const [foodDatabase, setFoodDatabase] = useState<FoodDatabase>('US');

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [caloriesPer100, setCaloriesPer100] = useState('');
  const [proteinPer100, setProteinPer100] = useState('');
  const [carbsPer100, setCarbsPer100] = useState('');
  const [fatPer100, setFatPer100] = useState('');

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedFoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [photoContext, setPhotoContext] = useState('');
  const [textDescription, setTextDescription] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([]);
  const [recipesSearchQuery, setRecipesSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Load food database setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAppSettings();
        setFoodDatabase(settings.foodDatabase || 'US');
      } catch (error) {
        console.error('Error loading food database setting:', error);
      }
    };
    loadSettings();
  }, []);

  const handleAddIngredient = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter ingredient name');
      return;
    }

    const qty = parseFloat(quantity);
    const cal = parseFloat(caloriesPer100);

    if (!qty || qty <= 0 || !cal || cal <= 0) {
      Alert.alert('Error', 'Please enter valid quantity and calories');
      return;
    }

    // Store ingredient data temporarily in AsyncStorage
    const ingredientData = {
      name: name.trim(),
      quantity: qty,
      unit,
      caloriesPer100: cal,
      proteinPer100: parseFloat(proteinPer100) || 0,
      carbsPer100: parseFloat(carbsPer100) || 0,
      fatPer100: parseFloat(fatPer100) || 0,
      timestamp: Date.now(),
    };

    // Store in AsyncStorage
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@pending_ingredient', JSON.stringify(ingredientData));
    } catch (error) {
      console.error('Error storing ingredient:', error);
    }

    // Navigate back
    navigation.goBack();
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true);
    try {
      const product = await lookupProductByBarcode(barcode);
      if (product) {
        setName(product.name);
        setCaloriesPer100(product.calories.toString());
        setProteinPer100(product.protein?.toString() || '');
        setCarbsPer100(product.carbs?.toString() || '');
        setFatPer100(product.fat?.toString() || '');
        setUnit('g');
        setInputMethod('manual');
      } else {
        Alert.alert('Not Found', 'Product not found in database');
        setInputMethod('select');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to lookup barcode');
      setInputMethod('select');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchOFFFoods(searchQuery);
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Error', 'Failed to search foods');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: UnifiedFoodItem) => {
    setName(item.description);
    setCaloriesPer100(item.calories.toString());
    setProteinPer100(item.protein?.toString() || '');
    setCarbsPer100(item.carbs?.toString() || '');
    setFatPer100(item.fat?.toString() || '');
    setUnit('g');
    setInputMethod('manual');
    setSearchQuery('');
  };

  const handleSelectOfflineFood = (food: OfflineFoodItem) => {
    setName(food.description);
    setCaloriesPer100((food.energy != null ? Math.round(food.energy) : 0).toString());
    setProteinPer100((food.protein != null ? food.protein : 0).toString());
    setCarbsPer100((food.carb != null ? food.carb : 0).toString());
    setFatPer100((food.fat != null ? food.fat : 0).toString());
    setUnit('g');
    setInputMethod('manual');
  };

  const processPhoto = async (imageUri: string) => {
    setLoading(true);
    try {
      const estimatedFood = await processFoodImage(imageUri, photoContext.trim() || undefined);

      // Calculate per-100 values from the total values
      const { calories, protein, carbs, fat, servingSize } = estimatedFood;
      const per100 = {
        calories: Math.round((calories / servingSize) * 100),
        protein: Math.round(((protein / servingSize) * 100) * 10) / 10,
        carbs: Math.round(((carbs / servingSize) * 100) * 10) / 10,
        fat: Math.round(((fat / servingSize) * 100) * 10) / 10,
      };

      // Create a single ingredient from the consolidated food entry
      const ingredientToAdd = {
        name: estimatedFood.name,
        quantity: servingSize,
        unit: estimatedFood.servingUnit,
        caloriesPer100: per100.calories,
        proteinPer100: per100.protein,
        carbsPer100: per100.carbs,
        fatPer100: per100.fat,
        timestamp: Date.now(),
      };

      // Store the ingredient in AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@pending_ingredients', JSON.stringify([ingredientToAdd]));

      // Navigate back to recipe editor
      navigation.goBack();
    } catch (error: any) {
      console.error('Error processing photo:', error);
      Alert.alert(
        'Error',
        `${error?.message || 'Failed to process the image.'} You can also enter it manually.`,
        [
          { text: 'Try Again', onPress: () => setInputMethod('photo') },
          { text: 'Cancel', onPress: () => setInputMethod('select') },
        ]
      );
    } finally {
      setLoading(false);
      setPhotoContext('');
    }
  };

  const processTextDescription = async () => {
    if (!textDescription.trim()) {
      Alert.alert('Error', 'Please enter a description of the ingredient');
      return;
    }

    setLoading(true);
    try {
      const estimatedFood = await processFoodDescription(
        textDescription.trim(),
        undefined
      );

      // Calculate per-100 values from the total values
      const { calories, protein, carbs, fat, servingSize } = estimatedFood;
      const per100 = {
        calories: Math.round((calories / servingSize) * 100),
        protein: Math.round(((protein / servingSize) * 100) * 10) / 10,
        carbs: Math.round(((carbs / servingSize) * 100) * 10) / 10,
        fat: Math.round(((fat / servingSize) * 100) * 10) / 10,
      };

      // Create ingredient from the estimated food
      const ingredientToAdd = {
        name: estimatedFood.name,
        quantity: servingSize,
        unit: estimatedFood.servingUnit,
        caloriesPer100: per100.calories,
        proteinPer100: per100.protein,
        carbsPer100: per100.carbs,
        fatPer100: per100.fat,
        timestamp: Date.now(),
      };

      // Store the ingredient in AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@pending_ingredients', JSON.stringify([ingredientToAdd]));

      // Navigate back to recipe editor
      navigation.goBack();
    } catch (error: any) {
      console.error('Error processing text description:', error);
      Alert.alert(
        'Error',
        `${error?.message || 'Failed to process your description.'} You can also enter it manually.`,
        [
          { text: 'Try Again', onPress: () => setInputMethod('text') },
          { text: 'Cancel', onPress: () => setInputMethod('select') },
        ]
      );
    } finally {
      setLoading(false);
      setTextDescription('');
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      await processPhoto(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processPhoto(result.assets[0].uri);
    }
  };

  const loadHistoryEntries = async () => {
    const allEntries = await getFoodEntries();
    const uniqueMap = new Map<string, FoodEntry>();
    allEntries.forEach(entry => {
      const key = `${entry.name}-${entry.caloriesPer100}-${entry.proteinPer100}-${entry.carbsPer100}-${entry.fatPer100}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, entry);
      }
    });
    const uniqueEntries = Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    setHistoryEntries(uniqueEntries);
  };

  const handleSelectHistoryEntry = (entry: FoodEntry) => {
    setName(entry.name);
    setQuantity(entry.quantity.toString());
    setUnit(entry.unit);
    setCaloriesPer100(entry.caloriesPer100.toString());
    setProteinPer100(entry.proteinPer100?.toString() || '');
    setCarbsPer100(entry.carbsPer100?.toString() || '');
    setFatPer100(entry.fatPer100?.toString() || '');
    setInputMethod('manual');
    setHistorySearchQuery('');
  };

  const loadRecipes = async () => {
    const allRecipes = await getRecipes();
    setRecipes(allRecipes);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setName(recipe.name);
    setQuantity('100');
    setUnit('g');
    setCaloriesPer100(recipe.caloriesPer100.toString());
    setProteinPer100(recipe.proteinPer100.toString());
    setCarbsPer100(recipe.carbsPer100.toString());
    setFatPer100(recipe.fatPer100.toString());
    setInputMethod('manual');
    setRecipesSearchQuery('');
  };

  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    if (textLower.includes(queryLower)) return true;
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === queryLower.length;
  };

  // Barcode scanner view
  if (inputMethod === 'barcode') {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      );
    }

    return (
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setInputMethod('select')}
      />
    );
  }

  // Manual entry view
  if (inputMethod === 'manual') {
    const qty = parseFloat(quantity) || 0;
    const cal = parseFloat(caloriesPer100) || 0;
    const prot = parseFloat(proteinPer100) || 0;
    const carb = parseFloat(carbsPer100) || 0;
    const f = parseFloat(fatPer100) || 0;

    const totalCalories = qty > 0 && cal > 0 ? Math.round((cal * qty) / 100) : 0;
    const totalProtein = qty > 0 && prot > 0 ? Math.round(((prot * qty) / 100) * 10) / 10 : 0;
    const totalCarbs = qty > 0 && carb > 0 ? Math.round(((carb * qty) / 100) * 10) / 10 : 0;
    const totalFat = qty > 0 && f > 0 ? Math.round(((f * qty) / 100) * 10) / 10 : 0;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Ingredient</Text>
          <TouchableOpacity onPress={handleAddIngredient}>
            <Text style={styles.saveButton}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Ingredient Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Chicken Breast"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="100"
              />
              <View style={styles.unitButtons}>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'g' && styles.unitButtonActive]}
                  onPress={() => setUnit('g')}
                >
                  <Text style={[styles.unitButtonText, unit === 'g' && styles.unitButtonTextActive]}>g</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'ml' && styles.unitButtonActive]}
                  onPress={() => setUnit('ml')}
                >
                  <Text style={[styles.unitButtonText, unit === 'ml' && styles.unitButtonTextActive]}>ml</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Per 100{unit}</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.smallLabel}>Calories</Text>
                <TextInput
                  style={styles.input}
                  value={caloriesPer100}
                  onChangeText={setCaloriesPer100}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.smallLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  value={proteinPer100}
                  onChangeText={setProteinPer100}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.smallLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbsPer100}
                  onChangeText={setCarbsPer100}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.smallLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fatPer100}
                  onChangeText={setFatPer100}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
          </View>

          {totalCalories > 0 && (
            <View style={styles.totalsPreview}>
              <Text style={styles.previewLabel}>Total for {quantity}{unit}:</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewValue}>{totalCalories} cal</Text>
                <Text style={styles.previewValue}>{totalProtein}g P</Text>
                <Text style={styles.previewValue}>{totalCarbs}g C</Text>
                <Text style={styles.previewValue}>{totalFat}g F</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Offline search view
  if (inputMethod === 'offline-search') {
    return (
      <OfflineFoodSearch
        onSelectFood={handleSelectOfflineFood}
        onCancel={() => setInputMethod('select')}
        database={foodDatabase}
      />
    );
  }

  // Search view
  if (inputMethod === 'search') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Foods</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            {searching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => handleSelectSearchResult(item)}
            >
              <Text style={styles.resultName}>{item.description}</Text>
              <Text style={styles.resultMacros}>
                {item.calories} cal | {item.protein || 0}g P | {item.carbs || 0}g C | {item.fat || 0}g F (per 100g)
              </Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // History view
  if (inputMethod === 'history') {
    const filteredHistory = historyEntries.filter(entry =>
      fuzzyMatch(entry.name, historySearchQuery)
    );

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search History</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search history..."
            value={historySearchQuery}
            onChangeText={setHistorySearchQuery}
            autoFocus
          />
        </View>

        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => handleSelectHistoryEntry(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMacros}>
                {item.caloriesPer100} cal per 100{item.unit}
              </Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // Recipes view
  if (inputMethod === 'recipes') {
    const filteredRecipes = recipes.filter(recipe =>
      fuzzyMatch(recipe.name, recipesSearchQuery)
    );

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Recipes</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={recipesSearchQuery}
            onChangeText={setRecipesSearchQuery}
            autoFocus
          />
        </View>

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => handleSelectRecipe(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMacros}>
                {item.caloriesPer100} cal per 100g
              </Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // Photo view
  if (inputMethod === 'photo') {
    if (loading) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analyzing photo...</Text>
            <Text style={styles.loadingSubtext}>Identifying ingredients and nutritional information</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Photo</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.photoContainer}>
          <View style={styles.photoContextSection}>
            <Text style={styles.photoLabel}>Hint (Optional)</Text>
            <TextInput
              style={styles.photoInput}
              placeholder="e.g., homemade lasagna"
              value={photoContext}
              onChangeText={setPhotoContext}
              multiline
            />
            <Text style={styles.contextHint}>
              Provide hints about what's in the photo to help the AI estimate calories more accurately
            </Text>
          </View>

          <TouchableOpacity style={styles.photoMethodCard} onPress={handleTakePhoto}>
            <View style={styles.photoMethodIcon}>
              <Ionicons name="camera-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.photoMethodTitle}>Take Photo</Text>
            <Text style={styles.photoMethodDescription}>
              Snap a photo of your meal with your camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoMethodCard} onPress={handlePickPhoto}>
            <View style={styles.photoMethodIcon}>
              <Ionicons name="images-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.photoMethodTitle}>Choose from Gallery</Text>
            <Text style={styles.photoMethodDescription}>
              Select an existing photo from your library
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Text description view
  if (inputMethod === 'text') {
    if (loading) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analyzing description...</Text>
            <Text style={styles.loadingSubtext}>Identifying ingredients and nutritional information</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setInputMethod('select')}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Text Description</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.photoContainer}>
          <View style={styles.photoContextSection}>
            <Text style={styles.photoLabel}>
              Describe the ingredient <Text style={{ color: '#FF3B30' }}>*</Text>
            </Text>
            <TextInput
              style={[styles.photoInput, { minHeight: 100 }]}
              placeholder="e.g., 200g grilled chicken breast, 2 cups cooked brown rice"
              value={textDescription}
              onChangeText={setTextDescription}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <Text style={styles.contextHint}>
              Describe the ingredient in detail. Include quantity if known.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.photoMethodCard, { backgroundColor: '#4CAF50' }]}
            onPress={processTextDescription}
            disabled={!textDescription.trim()}
          >
            <View style={[styles.photoMethodIcon, { backgroundColor: '#fff' }]}>
              <Ionicons name="sparkles" size={40} color="#4CAF50" />
            </View>
            <Text style={[styles.photoMethodTitle, { color: '#fff' }]}>
              Analyze with AI
            </Text>
            <Text style={[styles.photoMethodDescription, { color: '#fff', opacity: 0.9 }]}>
              Get instant calorie and macro estimates
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Selection grid (default view)
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Ingredient</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.selectionTitle}>How would you like to add this ingredient?</Text>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('manual')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="create-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Manual Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => {
              setInputMethod('history');
              loadHistoryEntries();
            }}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="time-outline" size={32} color="#FF9500" />
            </View>
            <Text style={styles.gridTitle}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('search')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="globe-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Online Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('offline-search')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="file-tray-full-outline" size={32} color="#34C759" />
            </View>
            <Text style={styles.gridTitle}>Offline Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('barcode')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="barcode-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridTitle}>Scan Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('photo')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="camera-outline" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.gridTitle}>AI Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setInputMethod('text')}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="chatbox-ellipses-outline" size={32} color="#FF9500" />
            </View>
            <Text style={styles.gridTitle}>AI Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => {
              setInputMethod('recipes');
              loadRecipes();
            }}
          >
            <View style={styles.gridIcon}>
              <Ionicons name="book-outline" size={32} color="#9C27B0" />
            </View>
            <Text style={styles.gridTitle}>My Recipes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  gridIcon: {
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 4,
    width: 100,
  },
  unitButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  totalsPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    margin: 16,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  resultMacros: {
    fontSize: 13,
    color: '#666',
  },
  photoContainer: {
    padding: 16,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  photoInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#fff',
    minHeight: 80,
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoContextSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contextHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 16,
  },
  photoMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoMethodIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoMethodTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  photoMethodDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
