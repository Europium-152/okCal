import { Platform } from 'react-native';

/**
 * Keyboard behaviour shared by every scrolling container and search field.
 *
 * Spread `keyboardScrollProps` onto every ScrollView / FlatList / SectionList. React Native's
 * default (`keyboardShouldPersistTaps: 'never'`) makes the first tap on a list row only close the
 * keyboard and never reaches the row's onPress. `'handled'` lets taps on touchables fire
 * immediately; a tap on empty space still dismisses the keyboard, and dragging the list does too.
 *
 * Spread `searchInputProps` onto every search/filter TextInput. Autocorrect rewrites half-typed
 * food names ("ber" -> "her") when the field loses focus, which also reshuffles the live results.
 *
 * `utils/__tests__/keyboardConventions.test.ts` fails if a new list or search field skips these.
 */
export const keyboardScrollProps = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
} as const;

export const searchInputProps = {
  autoCorrect: false,
  autoCapitalize: 'none',
  spellCheck: false,
} as const;
