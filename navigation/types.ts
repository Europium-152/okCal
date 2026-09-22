import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Root Stack Navigator Params
export type RootStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSetup: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  AddFood: { date?: string };
  LogWeight: undefined;
  AddIngredient: { recipeId?: string };
  Recipes: undefined;
  EditRecipe: { recipeId?: string };
  ExportImport: undefined;
};

// Tab Navigator Params
export type TabParamList = {
  Dashboard: undefined;
  Journal: undefined;
  Goals: undefined;
  Settings: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;

// Combined navigation prop type
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
