/**
 * okCal Color Palette
 * Centralized color definitions for consistent theming across the app
 */

export const Colors = {
  // Primary Brand Colors
  primary: '#4ECDC4',        // Teal - primary actions, buttons, links
  primaryDark: '#44A08D',    // Dark teal - gradients, hover states

  // Background Colors
  background: '#f8f9fa',     // Light gray - main background
  surface: '#ffffff',        // White - cards, containers
  surfaceLight: '#f5f5f5',   // Very light gray - subtle backgrounds

  // Text Colors
  text: '#333333',           // Dark gray - primary text
  textSecondary: '#666666',  // Medium gray - secondary text
  textTertiary: '#999999',   // Light gray - tertiary text, placeholders
  textInverse: '#ffffff',    // White - text on dark backgrounds

  // Border Colors
  border: '#e0e0e0',         // Light gray - default borders
  borderLight: '#f0f0f0',    // Very light gray - subtle borders
  borderDark: '#cccccc',     // Medium gray - emphasized borders

  // Status Colors
  success: '#34C759',        // Green - success states
  error: '#FF3B30',          // Red - errors, delete actions
  warning: '#FF9500',        // Orange - warnings, secondary actions
  info: '#4ECDC4',           // Teal - info states (same as primary)

  // Accent Colors
  calories: '#FF6B6B',       // Red - calorie displays
  protein: '#4ECDC4',        // Teal - protein
  carbs: '#4ECDC4',          // Teal - carbs
  fat: '#FFD93D',            // Yellow - fat
  gold: '#FFD700',           // Gold - achievements, premium
  purple: '#9C27B0',         // Purple - recipes

  // State Colors
  active: '#4ECDC4',         // Teal - active/selected states
  activeBackground: '#F0FFFE', // Very light teal - active card backgrounds
  activeBorder: '#4ECDC4',   // Teal - active borders
  disabled: '#cccccc',       // Gray - disabled states

  // Input Colors
  inputBackground: '#f8f9fa',  // Light gray - input backgrounds
  inputBorder: '#e0e0e0',      // Light gray - input borders
  inputText: '#333333',        // Dark gray - input text
  inputPlaceholder: '#999999', // Light gray - placeholder text

  // Chart Colors
  chartLine: '#4ECDC4',        // Teal - chart lines
  chartLegend: '#B8E8E6',      // Light teal - chart legend backgrounds
  chartGrid: '#D3D3D3',        // Light gray - chart grid lines

  // Special Colors
  overlay: 'rgba(0, 0, 0, 0.5)',     // Semi-transparent black - overlays
  shadowLight: 'rgba(0, 0, 0, 0.1)', // Light shadow
  shadowMedium: 'rgba(0, 0, 0, 0.2)', // Medium shadow
  shadowDark: 'rgba(0, 0, 0, 0.3)',  // Dark shadow
} as const;

// Legacy color mapping (for reference during migration)
export const LegacyColors = {
  appleBlue: '#007AFF',  // Old primary color - being replaced by Colors.primary
} as const;

// Type for Colors object keys
export type ColorKey = keyof typeof Colors;
