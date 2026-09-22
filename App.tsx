import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import RootStackNavigator from '@/navigation/RootStackNavigator';
import { RootStackParamList } from '@/navigation/types';
import { getUserProfile } from '@/utils/storage';

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['okcal://'],
  config: {
    screens: {
      OnboardingWelcome: 'onboarding-welcome',
      OnboardingSetup: 'onboarding-setup',
      Main: {
        path: 'tabs',
        screens: {
          Dashboard: 'dashboard',
          Journal: 'journal',
          Goals: 'goals',
          Settings: 'settings',
        },
      },
      AddFood: {
        path: 'add-food',
        parse: {
          date: (date: string) => date,
        },
      },
      LogWeight: 'log-weight',
      AddIngredient: 'add-ingredient',
      Recipes: 'recipes',
      EditRecipe: {
        path: 'edit-recipe',
        parse: {
          recipeId: (recipeId: string) => recipeId,
        },
      },
      ExportImport: 'export-import',
    },
  },
};

export default function App() {
  // Everything lives on the device: first launch (no profile yet) goes to onboarding,
  // otherwise straight into the app.
  const [initialRoute, setInitialRoute] = useState<'Main' | 'OnboardingWelcome' | null>(null);

  useEffect(() => {
    getUserProfile()
      .then(profile => setInitialRoute(profile ? 'Main' : 'OnboardingWelcome'))
      .catch(() => setInitialRoute('OnboardingWelcome'));
  }, []);

  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <StatusBar style="dark" />
      <RootStackNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  );
}
