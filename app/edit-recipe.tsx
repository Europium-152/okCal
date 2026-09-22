import React, { useState, useEffect } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '@/navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, RecipeIngredient } from '@/types';
import { saveRecipe, getRecipeById } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditRecipe({ navigation, route }: RootStackScreenProps<'EditRecipe'>) {
  const params = route.params || {};
  const recipeId = params.recipeId as string | undefined;
  const isEditing = recipeId && recipeId !== 'new';

  const [recipeName, setRecipeName] = useState('');
  const [preparedWeight, setPreparedWeight] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadRecipe();
    } else {
      setIsLoaded(true);
    }
  }, []);

  // Check for pending ingredient when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkPendingIngredient();
    }, [])
  );

  const checkPendingIngredient = async () => {
    try {
      // Check for multiple ingredients (from AI photo)
      const pendingMultipleData = await AsyncStorage.getItem('@pending_ingredients');
      if (pendingMultipleData) {
        const ingredientsData = JSON.parse(pendingMultipleData);
        const newIngredients = ingredientsData.map((data: any, index: number) => {
          const qty = data.quantity;
          const calPer100 = data.caloriesPer100;
          const protPer100 = data.proteinPer100 || 0;
          const carbsPer100 = data.carbsPer100 || 0;
          const fatPer100 = data.fatPer100 || 0;

          const totals = calculateIngredientTotals(qty, calPer100, protPer100, carbsPer100, fatPer100);

          return {
            id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            name: data.name,
            quantity: qty,
            unit: data.unit,
            calories: totals.calories,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
            caloriesPer100: calPer100,
            proteinPer100: protPer100,
            carbsPer100: carbsPer100,
            fatPer100: fatPer100,
          };
        });

        setIngredients(prevIngredients => [...prevIngredients, ...newIngredients]);
        await AsyncStorage.removeItem('@pending_ingredients');
        return;
      }

      // Check for single ingredient (from manual/barcode/search/history/recipe)
      const pendingData = await AsyncStorage.getItem('@pending_ingredient');
      if (pendingData) {
        const data = JSON.parse(pendingData);
        const qty = data.quantity;
        const calPer100 = data.caloriesPer100;
        const protPer100 = data.proteinPer100 || 0;
        const carbsPer100 = data.carbsPer100 || 0;
        const fatPer100 = data.fatPer100 || 0;

        const totals = calculateIngredientTotals(qty, calPer100, protPer100, carbsPer100, fatPer100);

        const newIngredient: RecipeIngredient = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: data.name,
          quantity: qty,
          unit: data.unit,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          caloriesPer100: calPer100,
          proteinPer100: protPer100,
          carbsPer100: carbsPer100,
          fatPer100: fatPer100,
        };

        setIngredients(prevIngredients => [...prevIngredients, newIngredient]);
        await AsyncStorage.removeItem('@pending_ingredient');
      }
    } catch (error) {
      console.error('Error checking pending ingredient:', error);
    }
  };

  const loadRecipe = async () => {
    if (!recipeId || recipeId === 'new') return;
    const recipe = await getRecipeById(recipeId);
    if (recipe) {
      setRecipeName(recipe.name);
      setPreparedWeight(recipe.preparedWeightG.toString());
      setIngredients(recipe.ingredients);
    }
    setIsLoaded(true);
  };

  const calculateIngredientTotals = (
    qty: number,
    calPer100: number,
    protPer100: number,
    carbsPer100: number,
    fatPer100: number
  ) => {
    return {
      calories: Math.round((calPer100 * qty) / 100),
      protein: Math.round(((protPer100 * qty) / 100) * 10) / 10,
      carbs: Math.round(((carbsPer100 * qty) / 100) * 10) / 10,
      fat: Math.round(((fatPer100 * qty) / 100) * 10) / 10,
    };
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const calculateRecipeNutrition = () => {
    const prepWeight = parseFloat(preparedWeight);
    if (!prepWeight || prepWeight <= 0 || ingredients.length === 0) {
      return {
        caloriesPer100: 0,
        proteinPer100: 0,
        carbsPer100: 0,
        fatPer100: 0,
      };
    }

    // Sum all ingredient nutrition
    const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);

    // Calculate per-100g values
    return {
      caloriesPer100: Math.round((totalCalories * 100) / prepWeight),
      proteinPer100: Math.round(((totalProtein * 100) / prepWeight) * 10) / 10,
      carbsPer100: Math.round(((totalCarbs * 100) / prepWeight) * 10) / 10,
      fatPer100: Math.round(((totalFat * 100) / prepWeight) * 10) / 10,
    };
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      Alert.alert('Error', 'Please enter a recipe name');
      return;
    }

    const prepWeight = parseFloat(preparedWeight);
    if (!prepWeight || prepWeight <= 0) {
      Alert.alert('Error', 'Please enter the prepared weight');
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    const nutrition = calculateRecipeNutrition();
    const now = new Date().toISOString();

    const recipe: Recipe = {
      id: recipeId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: recipeName.trim(),
      ingredients,
      preparedWeightG: prepWeight,
      caloriesPer100: nutrition.caloriesPer100,
      proteinPer100: nutrition.proteinPer100,
      carbsPer100: nutrition.carbsPer100,
      fatPer100: nutrition.fatPer100,
      createdAt: isEditing ? (await getRecipeById(recipeId!))?.createdAt || now : now,
      updatedAt: now,
    };

    await saveRecipe(recipe);
    navigation.goBack();
  };

  const nutrition = calculateRecipeNutrition();

  const renderIngredient = ({ item }: { item: RecipeIngredient }) => {
    return (
      <View style={styles.ingredientCard}>
        <View style={styles.ingredientHeader}>
          <Text style={styles.ingredientName} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity onPress={() => handleDeleteIngredient(item.id)}>
            <Ionicons name="trash" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <View style={styles.ingredientDetails}>
          <Text style={styles.ingredientWeight}>
            {item.quantity}
            {item.unit}
          </Text>
          <Text style={styles.ingredientMacro}>{item.calories} cal</Text>
          <Text style={styles.ingredientMacro}>{item.protein}g P</Text>
          <Text style={styles.ingredientMacro}>{item.carbs}g C</Text>
          <Text style={styles.ingredientMacro}>{item.fat}g F</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Recipe' : 'New Recipe'}</Text>
          <TouchableOpacity onPress={handleSaveRecipe}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Chicken Stir Fry"
            value={recipeName}
            onChangeText={setRecipeName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prepared Weight (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="Total weight after cooking"
            value={preparedWeight}
            onChangeText={setPreparedWeight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients ({ingredients.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddIngredient', { recipeId: recipeId || 'new' })}>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {ingredients.length > 0 && (
            <FlatList
              data={ingredients}
              renderItem={renderIngredient}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.ingredientsList}
            />
          )}

        </View>

        {ingredients.length > 0 && parseFloat(preparedWeight) > 0 && (
          <View style={styles.nutritionPreview}>
            <Text style={styles.previewTitle}>Nutritional Info (per 100g)</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Ionicons name="flame" size={16} color="#FF6B6B" />
                <Text style={styles.previewValue}>{nutrition.caloriesPer100} cal</Text>
              </View>
              <Text style={styles.previewValue}>{nutrition.proteinPer100}g P</Text>
              <Text style={styles.previewValue}>{nutrition.carbsPer100}g C</Text>
              <Text style={styles.previewValue}>{nutrition.fatPer100}g F</Text>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
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
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  ingredientsList: {
    marginBottom: 12,
  },
  ingredientCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 8,
  },
  ingredientDetails: {
    flexDirection: 'row',
    gap: 10,
  },
  ingredientWeight: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  ingredientMacro: {
    fontSize: 13,
    color: '#495057',
  },
  addIngredientForm: {
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  unitSelector: {
    width: 100,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 4,
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
  formButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  addButton: {
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  nutritionPreview: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
});
