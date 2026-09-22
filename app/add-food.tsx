import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Alert,
} from 'react-native';
import { RootStackScreenProps } from '@/navigation/types';
import { saveFoodEntry, getFoodEntries, getRecipes, getAppSettings } from '@/utils/storage';
import { FoodEntry, Recipe, UnifiedFoodItem, FoodDatabase } from '@/types';
import BarcodeScanner from '@/components/BarcodeScanner';
import { lookupProductByBarcode, ProductInfo, searchOFFFoods } from '@/services/foodLookup';
import { OfflineFoodItem } from '@/services/offlineFoodSearch';
import { detectUnit } from '@/utils/nutritionCalculator';
import { parseDate } from '@/utils/dateHelpers';
import * as ImagePicker from 'expo-image-picker';
import { processFoodImage, processFoodDescription, EstimatedFood } from '@/services/aiService';
import { useNutritionForm } from '@/hooks/useNutritionForm';
import { useDateTimeEntry } from '@/hooks/useDateTimeEntry';
import LoadingView from '@/components/add-food/LoadingView';
import InputMethodSelector from '@/components/add-food/InputMethodSelector';
import PhotoFoodInput from '@/components/add-food/PhotoFoodInput';
import TextFoodInput from '@/components/add-food/TextFoodInput';
import SearchFoodInput from '@/components/add-food/SearchFoodInput';
import OfflineFoodSearch from '@/components/add-food/OfflineFoodSearch';
import HistoryFoodInput from '@/components/add-food/HistoryFoodInput';
import RecipeFoodInput from '@/components/add-food/RecipeFoodInput';
import ManualFoodInput from '@/components/add-food/ManualFoodInput';

type InputMethod = 'select' | 'manual' | 'barcode' | 'search' | 'offline-search' | 'photo' | 'text' | 'history' | 'recipes';

export default function AddFood({ navigation, route }: RootStackScreenProps<'AddFood'>) {
  const params = route.params || {};

  // Custom hooks for nutrition form and date/time entry
  const nutritionForm = useNutritionForm();
  const dateTime = useDateTimeEntry(params.date as string);

  const [inputMethod, setInputMethod] = useState<InputMethod>('select');
  const [foodDatabase, setFoodDatabase] = useState<FoodDatabase>('US');

  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductInfo | null>(null);

  // Ref to track if a barcode scan is already being processed
  const isScanningRef = useRef(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedFoodItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Photo context state
  const [photoContext, setPhotoContext] = useState('');

  // Text description state
  const [textDescription, setTextDescription] = useState('');

  // History search state
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([]);

  // Recipes state
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

  const handleBarcodeScanned = async (barcode: string) => {
    // Prevent multiple simultaneous scans using a ref
    if (isScanningRef.current) {
      console.log('Scan already in progress, ignoring duplicate scan');
      return;
    }

    // Mark that we're processing a scan
    isScanningRef.current = true;

    // Immediately close the scanner to prevent multiple scans
    setInputMethod('select');
    setLoading(true);

    try {
      const product = await lookupProductByBarcode(barcode);

      if (product) {
        setScannedProduct(product);
        const detectedUnit = detectUnit(product.servingSize);
        nutritionForm.setNutritionData({
          name: product.brand ? `${product.brand} - ${product.name}` : product.name,
          unit: detectedUnit,
          quantity: '100',
          caloriesPer100: product.calories.toString(),
          proteinPer100: product.protein?.toString() || '',
          carbsPer100: product.carbs?.toString() || '',
          fatPer100: product.fat?.toString() || '',
        });
        setInputMethod('manual');
      } else {
        Alert.alert(
          'Product Not Found',
          'Could not find nutritional information for this barcode. Please enter manually.',
          [
            {
              text: 'Enter Manually',
              onPress: () => {
                isScanningRef.current = false;
                setInputMethod('manual');
              },
            },
            {
              text: 'Scan Again',
              onPress: () => {
                isScanningRef.current = false;
                setInputMethod('barcode');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);

      // Check if it's a network error
      const isNetworkError = error instanceof TypeError ||
                            (error instanceof Error &&
                             (error.message.includes('network') ||
                              error.message.includes('fetch') ||
                              error.message.includes('Network request failed')));

      const errorMessage = isNetworkError
        ? 'No internet connection. Please check your network and try again, or enter the food manually.'
        : 'Failed to lookup product information. Please try again or enter manually.';

      Alert.alert(
        'Lookup Failed',
        errorMessage,
        [
          {
            text: 'Enter Manually',
            onPress: () => {
              isScanningRef.current = false;
              setInputMethod('manual');
            },
          },
          {
            text: 'Try Again',
            onPress: () => {
              isScanningRef.current = false;
              setInputMethod('barcode');
            },
          },
        ]
      );
    } finally {
      setLoading(false);
      isScanningRef.current = false;
    }
  };

  const handlePhotoCapture = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos of your food.');
      setInputMethod('select');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processPhoto(result.assets[0].uri);
    } else {
      setInputMethod('select');
    }
  };

  const handlePhotoSelection = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select photos.');
      setInputMethod('select');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processPhoto(result.assets[0].uri);
    } else {
      setInputMethod('select');
    }
  };

  // Helper function to convert date and time strings to timestamp
  const getTimestampFromDateTime = (dateStr: string, timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = parseDate(dateStr); // Use parseDate for local timezone
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  const processPhoto = async (imageUri: string) => {
    setLoading(true);
    try {
      console.log('Processing food image...');
      const estimatedFood = await processFoodImage(imageUri, photoContext.trim() || undefined);

      // Save the consolidated food entry to the journal
      await saveFoodToJournal(estimatedFood);

      Alert.alert(
        'Success',
        `Successfully logged "${estimatedFood.name}" to your journal!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
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
    }
  };

  const saveFoodToJournal = async (estimatedFood: EstimatedFood): Promise<void> => {
    // Calculate timestamp from date and time
    const timestamp = dateTime.getTimestamp();

    // Calculate per-100 values from the total values
    const { calories, protein, carbs, fat, servingSize } = estimatedFood;
    const per100 = {
      calories: Math.round((calories / servingSize) * 100),
      protein: Math.round(((protein / servingSize) * 100) * 10) / 10,
      carbs: Math.round(((carbs / servingSize) * 100) * 10) / 10,
      fat: Math.round(((fat / servingSize) * 100) * 10) / 10,
    };

    const entry: FoodEntry = {
      id: Date.now().toString(),
      date: dateTime.entryDate,
      name: estimatedFood.name,
      quantity: servingSize,
      unit: estimatedFood.servingUnit,
      caloriesPer100: per100.calories,
      proteinPer100: per100.protein,
      carbsPer100: per100.carbs,
      fatPer100: per100.fat,
      calories,
      protein,
      carbs,
      fat,
      timestamp,
    };

    await saveFoodEntry(entry);
  };

  const processTextDescription = async () => {
    if (!textDescription.trim()) {
      Alert.alert('Error', 'Please enter a description of your meal');
      return;
    }

    setLoading(true);
    try {
      console.log('Processing text description...');
      const estimatedFood = await processFoodDescription(
        textDescription.trim(),
        undefined
      );

      // Save the consolidated food entry to the journal
      await saveFoodToJournal(estimatedFood);

      Alert.alert(
        'Success',
        `Successfully logged "${estimatedFood.name}" to your journal!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
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

  const handleSave = async () => {
    if (!nutritionForm.name.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    if (!nutritionForm.quantity.trim() || isNaN(Number(nutritionForm.quantity)) || Number(nutritionForm.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!nutritionForm.caloriesPer100.trim() || isNaN(Number(nutritionForm.caloriesPer100)) || Number(nutritionForm.caloriesPer100) < 0) {
      Alert.alert('Error', 'Please enter valid calories per 100' + nutritionForm.unit);
      return;
    }

    // Validate date format
    if (!dateTime.entryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    // Validate time format
    if (!dateTime.entryTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Error', 'Please enter time in HH:MM format');
      return;
    }

    // Calculate timestamp from date and time
    const timestamp = dateTime.getTimestamp();

    const entry: FoodEntry = {
      id: Date.now().toString(),
      date: dateTime.entryDate,
      name: nutritionForm.name.trim(),
      quantity: Number(nutritionForm.quantity),
      unit: nutritionForm.unit,
      caloriesPer100: Number(nutritionForm.caloriesPer100),
      proteinPer100: nutritionForm.proteinPer100 ? Number(nutritionForm.proteinPer100) : undefined,
      carbsPer100: nutritionForm.carbsPer100 ? Number(nutritionForm.carbsPer100) : undefined,
      fatPer100: nutritionForm.fatPer100 ? Number(nutritionForm.fatPer100) : undefined,
      calories: Number(nutritionForm.totalCalories),
      protein: nutritionForm.totalProtein ? Number(nutritionForm.totalProtein) : undefined,
      carbs: nutritionForm.totalCarbs ? Number(nutritionForm.totalCarbs) : undefined,
      fat: nutritionForm.totalFat ? Number(nutritionForm.totalFat) : undefined,
      timestamp,
    };

    try {
      await saveFoodEntry(entry);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save food entry');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search Open Food Facts (no API key required)
      const results = await searchOFFFoods(searchQuery);
      setSearchResults(results);
      setSearching(false);
    } catch (error: any) {
      setSearching(false);
      console.error('Error searching foods:', error);
      Alert.alert('Error', 'Failed to search foods. Please try again.');
      setSearchResults([]);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectFood = (food: UnifiedFoodItem) => {
    const displayName = food.brandName
      ? `${food.brandName} - ${food.description}`
      : food.description;

    nutritionForm.setNutritionData({
      name: displayName,
      unit: 'g',
      quantity: '100',
      caloriesPer100: food.calories.toString(),
      proteinPer100: food.protein?.toString() || '',
      carbsPer100: food.carbs?.toString() || '',
      fatPer100: food.fat?.toString() || '',
    });
    setInputMethod('manual');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectOfflineFood = (food: OfflineFoodItem) => {
    nutritionForm.setNutritionData({
      name: food.description,
      unit: 'g',
      quantity: '100',
      caloriesPer100: (food.energy != null ? Math.round(food.energy) : 0).toString(),
      proteinPer100: (food.protein != null ? food.protein : 0).toString(),
      carbsPer100: (food.carb != null ? food.carb : 0).toString(),
      fatPer100: (food.fat != null ? food.fat : 0).toString(),
    });
    setInputMethod('manual');
  };

  const resetForm = () => {
    setScannedProduct(null);
    nutritionForm.resetForm();
    setPhotoContext('');
  };

  // Load history entries when switching to history mode
  const loadHistoryEntries = async () => {
    try {
      const allEntries = await getFoodEntries();

      // Get unique food entries (by name and nutritional values)
      const uniqueMap = new Map<string, FoodEntry>();
      allEntries.forEach(entry => {
        const key = `${entry.name}-${entry.caloriesPer100}-${entry.proteinPer100}-${entry.carbsPer100}-${entry.fatPer100}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, entry);
        }
      });

      // Sort by most recent
      const uniqueEntries = Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      setHistoryEntries(uniqueEntries);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Handle selecting a history entry
  const handleSelectHistoryEntry = (entry: FoodEntry) => {
    nutritionForm.setNutritionData({
      name: entry.name,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      caloriesPer100: entry.caloriesPer100.toString(),
      proteinPer100: entry.proteinPer100?.toString() || '',
      carbsPer100: entry.carbsPer100?.toString() || '',
      fatPer100: entry.fatPer100?.toString() || '',
    });
    setInputMethod('manual');
    setHistorySearchQuery('');
  };

  // Load recipes from storage
  const loadRecipes = async () => {
    try {
      const allRecipes = await getRecipes();
      setRecipes(allRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  // Handle selecting a recipe
  const handleSelectRecipe = (recipe: Recipe) => {
    nutritionForm.setNutritionData({
      name: recipe.name,
      quantity: '100',
      unit: 'g',
      caloriesPer100: recipe.caloriesPer100.toString(),
      proteinPer100: recipe.proteinPer100.toString(),
      carbsPer100: recipe.carbsPer100.toString(),
      fatPer100: recipe.fatPer100.toString(),
    });
    setInputMethod('manual');
    setRecipesSearchQuery('');
  };

  // Show barcode scanner
  if (inputMethod === 'barcode') {
    if (loading) {
      return <LoadingView message="Looking up product..." />;
    }

    return (
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setInputMethod('select')}
      />
    );
  }

  // Show photo options
  if (inputMethod === 'photo') {
    if (loading) {
      return <LoadingView message="Analyzing your food..." submessage="This may take a few moments" />;
    }

    return (
      <PhotoFoodInput
        photoContext={photoContext}
        onPhotoContextChange={setPhotoContext}
        onTakePhoto={handlePhotoCapture}
        onSelectPhoto={handlePhotoSelection}
        onCancel={() => setInputMethod('select')}
      />
    );
  }

  // Show text description input
  if (inputMethod === 'text') {
    if (loading) {
      return <LoadingView message="Analyzing your description..." submessage="This may take a few moments" />;
    }

    return (
      <TextFoodInput
        textDescription={textDescription}
        onTextChange={setTextDescription}
        onAnalyze={processTextDescription}
        onCancel={() => {
          setTextDescription('');
          setInputMethod('select');
        }}
      />
    );
  }

  // Show input method selection
  if (inputMethod === 'select') {
    return (
      <InputMethodSelector
        entryDate={dateTime.entryDate}
        entryTime={dateTime.entryTime}
        onDateChange={dateTime.setEntryDate}
        onTimeChange={dateTime.setEntryTime}
        onMethodSelect={setInputMethod}
        onCancel={() => navigation.goBack()}
        onLoadHistory={loadHistoryEntries}
        onLoadRecipes={loadRecipes}
      />
    );
  }

  // Fuzzy search function
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact substring match
    if (textLower.includes(queryLower)) return true;

    // Fuzzy match: all characters in query must appear in order in text
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }

    return queryIndex === queryLower.length;
  };

  // Show history search screen
  if (inputMethod === 'history') {
    return (
      <HistoryFoodInput
        historyEntries={historyEntries}
        searchQuery={historySearchQuery}
        onSearchQueryChange={setHistorySearchQuery}
        onSelectEntry={handleSelectHistoryEntry}
        onCancel={() => setInputMethod('select')}
        fuzzyMatch={fuzzyMatch}
      />
    );
  }

  // Show recipes screen
  if (inputMethod === 'recipes') {
    return (
      <RecipeFoodInput
        recipes={recipes}
        searchQuery={recipesSearchQuery}
        onSearchQueryChange={setRecipesSearchQuery}
        onSelectRecipe={handleSelectRecipe}
        onCancel={() => setInputMethod('select')}
        fuzzyMatch={fuzzyMatch}
      />
    );
  }

  // Show online search screen
  if (inputMethod === 'search') {
    return (
      <SearchFoodInput
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searching={searching}
        onSelectFood={handleSelectFood}
        onCancel={() => setInputMethod('select')}
      />
    );
  }

  // Show offline search screen
  if (inputMethod === 'offline-search') {
    return (
      <OfflineFoodSearch
        onSelectFood={handleSelectOfflineFood}
        onCancel={() => setInputMethod('select')}
        database={foodDatabase}
      />
    );
  }

  // Show manual entry form
  return (
    <ManualFoodInput
      name={nutritionForm.name}
      setName={nutritionForm.setName}
      quantity={nutritionForm.quantity}
      setQuantity={nutritionForm.setQuantity}
      unit={nutritionForm.unit}
      setUnit={nutritionForm.setUnit}
      caloriesPer100={nutritionForm.caloriesPer100}
      setCaloriesPer100={nutritionForm.setCaloriesPer100}
      proteinPer100={nutritionForm.proteinPer100}
      setProteinPer100={nutritionForm.setProteinPer100}
      carbsPer100={nutritionForm.carbsPer100}
      setCarbsPer100={nutritionForm.setCarbsPer100}
      fatPer100={nutritionForm.fatPer100}
      setFatPer100={nutritionForm.setFatPer100}
      totalCalories={nutritionForm.totalCalories}
      totalProtein={nutritionForm.totalProtein}
      totalCarbs={nutritionForm.totalCarbs}
      totalFat={nutritionForm.totalFat}
      scannedProduct={scannedProduct}
      onSave={handleSave}
      onCancel={() => {
        if (scannedProduct) {
          setInputMethod('select');
          resetForm();
        } else {
          navigation.goBack();
        }
      }}
    />
  );
}

