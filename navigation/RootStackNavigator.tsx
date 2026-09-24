import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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
      // react-native-screens crashes natively (RNSScreenContainerView updateContainer,
      // "collection mutated while being enumerated") when the JS stack drives a screen's
      // activityState through the native animated driver. Keep inactive screens attached.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: 'none',
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditRecipe"
        component={EditRecipeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ExportImport"
        component={ExportImportScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
