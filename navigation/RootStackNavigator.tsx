import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { RootStackParamList } from './types';

// Import screens
import OnboardingWelcomeScreen from '@/app/onboarding-welcome';
import OnboardingSetupScreen from '@/app/onboarding-setup';
import AddFoodScreen from '@/app/add-food';
import LogWeightScreen from '@/app/log-weight';
import AddIngredientScreen from '@/app/add-ingredient';
import RecipesScreen from '@/app/recipes';
import EditRecipeScreen from '@/app/edit-recipe';
import ExportImportScreen from '@/app/export-import';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootStackNavigator({
  initialRouteName,
}: {
  initialRouteName: keyof RootStackParamList;
}) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        animationEnabled: false,
      }}
    >
      {/* Onboarding Screens */}
      <Stack.Screen
        name="OnboardingWelcome"
        component={OnboardingWelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OnboardingSetup"
        component={OnboardingSetupScreen}
        options={{ headerShown: false }}
      />

      {/* Main App (Tabs) */}
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* Modal Screens */}
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Food Entry'
        }}
      />
      <Stack.Screen
        name="LogWeight"
        component={LogWeightScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Log Weight'
        }}
      />
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Ingredient'
        }}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          headerShown: true,
          title: 'My Recipes'
        }}
      />
      <Stack.Screen
        name="EditRecipe"
        component={EditRecipeScreen}
        options={{
          headerShown: true,
          title: 'Edit Recipe'
        }}
      />
      <Stack.Screen
        name="ExportImport"
        component={ExportImportScreen}
        options={{
          headerShown: true,
          title: 'Export / Import Data'
        }}
      />
    </Stack.Navigator>
  );
}
