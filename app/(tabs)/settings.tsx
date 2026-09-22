import React, { useState, useEffect } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackScreenProps } from '@/navigation/types';
import {
  getAppSettings,
  saveAppSettings,
  getWeightEntries,
  saveWeightEntry,
  deleteWeightEntry,
  getOpenAIApiKey,
  saveOpenAIApiKey,
  clearAllUserData,
} from '@/utils/storage';
import { Units, WeightEntry, FoodDatabase } from '@/types';
import { kgFromLbs, lbsFromKg } from '@/constants/nutrition';
import { importMacroFactorFoodLog, previewMacroFactorImport } from '@/services/importService';
import { importMacroFactorWeightLog, previewMacroFactorWeightImport } from '@/services/weightImportService';
import { DONATION_URL } from '@/constants/links';
import { parseDate, getTodayString } from '@/utils/dateHelpers';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [units, setUnits] = useState<Units>('imperial');
  const [foodDatabase, setFoodDatabase] = useState<FoodDatabase>('US');
  const [loading, setLoading] = useState(true);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    totalEntries: number;
    dateRange: { start: string; end: string } | null;
    conflictingDates: string[];
    csvContent: string;
  } | null>(null);
  const [openAIKey, setOpenAIKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [importingWeight, setImportingWeight] = useState(false);
  const [showWeightImportPreview, setShowWeightImportPreview] = useState(false);
  const [weightImportPreview, setWeightImportPreview] = useState<{
    totalEntries: number;
    dateRange: { start: string; end: string } | null;
    conflictingDates: string[];
    fileContent: ArrayBuffer;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadWeightEntries();
    }, [units])
  );

  const loadSettings = async () => {
    try {
      const settings = await getAppSettings();
      setUnits(settings.units);
      setFoodDatabase(settings.foodDatabase || 'US');
      setOpenAIKey((await getOpenAIApiKey()) || '');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeightEntries = async () => {
    try {
      const entries = await getWeightEntries();
      setWeightEntries(entries.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading weight entries:', error);
    }
  };

  const handleUnitsChange = async (newUnits: Units) => {
    try {
      setUnits(newUnits);
      await saveAppSettings({ units: newUnits, foodDatabase });
      Alert.alert('Success', 'Units setting updated!');
    } catch (error) {
      console.error('Error saving units setting:', error);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  const handleFoodDatabaseChange = async (newDatabase: FoodDatabase) => {
    try {
      setFoodDatabase(newDatabase);
      await saveAppSettings({ units, foodDatabase: newDatabase });
      Alert.alert('Success', 'Food database updated!');
    } catch (error) {
      console.error('Error saving food database setting:', error);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  const maskApiKey = (key: string) =>
    key ? `${key.slice(0, 3)}...${key.slice(-4)}` : 'Not set';

  const handleSaveApiKey = async () => {
    try {
      await saveOpenAIApiKey(apiKeyInput);
      setOpenAIKey(apiKeyInput.trim());
      setShowApiKeyModal(false);
      setApiKeyInput('');
    } catch (error) {
      console.error('Error saving OpenAI API key:', error);
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    }
  };

  const handleDonate = () => {
    Linking.openURL(DONATION_URL).catch(() =>
      Alert.alert('Error', 'Could not open the link.')
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This permanently deletes all the data stored on this device (food logs, weight entries, recipes, profile). It cannot be undone. Consider exporting a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllUserData();
              navigation.reset({ index: 0, routes: [{ name: 'OnboardingWelcome' }] });
            } catch (error) {
              console.error('Delete data error:', error);
              Alert.alert('Error', 'Failed to delete data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddNewWeight = () => {
    setIsAddingNew(true);
    setEditingEntry(null);
    setEditDate(getTodayString()); // Use getTodayString for local timezone
    setEditWeight('');
    setShowEditModal(true);
  };

  const handleEditWeight = (entry: WeightEntry) => {
    setIsAddingNew(false);
    setEditingEntry(entry);
    setEditDate(entry.date);
    const displayWeight = units === 'metric' ? kgFromLbs(entry.weight).toFixed(1) : entry.weight.toString();
    setEditWeight(displayWeight);
    setShowEditModal(true);
  };

  const handleDeleteWeight = async (entry: WeightEntry) => {
    const date = parseDate(entry.date);
    Alert.alert(
      'Delete Weight Entry',
      `Are you sure you want to delete the entry from ${date.toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWeightEntry(entry.id);
              await loadWeightEntries();
              Alert.alert('Success', 'Weight entry deleted!');
            } catch (error) {
              console.error('Error deleting weight entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSaveWeight = async () => {
    // Validate date
    if (!editDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    // Prevent future dates
    const entryDate = parseDate(editDate); // Use parseDate for local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate > today) {
      Alert.alert('Invalid Date', 'Weight entries cannot be in the future');
      return;
    }

    // Validate weight
    const weightNum = parseFloat(editWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    try {
      // Convert to lbs if needed
      const weightInLbs = units === 'metric' ? lbsFromKg(weightNum) : weightNum;

      if (isAddingNew) {
        // Create new entry
        const newEntry: WeightEntry = {
          id: `weight_${Date.now()}`,
          date: editDate,
          weight: weightInLbs,
          timestamp: parseDate(editDate).getTime(), // Use parseDate for local timezone
        };
        await saveWeightEntry(newEntry);
        Alert.alert('Success', 'Weight entry added!');
      } else if (editingEntry) {
        // Update existing entry by deleting and recreating
        await deleteWeightEntry(editingEntry.id);
        const updatedEntry: WeightEntry = {
          ...editingEntry,
          date: editDate,
          weight: weightInLbs,
          timestamp: parseDate(editDate).getTime(), // Use parseDate for local timezone
        };
        await saveWeightEntry(updatedEntry);
        Alert.alert('Success', 'Weight entry updated!');
      }

      setShowEditModal(false);
      await loadWeightEntries();
    } catch (error) {
      console.error('Error saving weight entry:', error);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    }
  };

  const handleImportMacroFactor = async () => {
    try {
      setImporting(true);

      // Pick CSV file
      // Note: Using '*/*' to allow all file types because iOS 'On My iPhone'
      // often grays out files when using specific MIME types without iCloud entitlements
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImporting(false);
        return;
      }

      // Read file content
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const csvContent = await response.text();

      // Generate preview
      const preview = await previewMacroFactorImport(csvContent);

      if (preview.totalEntries === 0) {
        Alert.alert('No Data', 'No valid food entries found in the CSV file.');
        setImporting(false);
        return;
      }

      // Show preview modal
      setImportPreview({
        totalEntries: preview.totalEntries,
        dateRange: preview.dateRange,
        conflictingDates: preview.conflictingDates,
        csvContent,
      });
      setShowImportPreview(true);
      setImporting(false);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read CSV file. Please try again.');
      setImporting(false);
    }
  };

  const handleConfirmImport = async (overwrite: boolean) => {
    if (!importPreview) return;

    try {
      setImporting(true);
      setShowImportPreview(false);

      const result = await importMacroFactorFoodLog(importPreview.csvContent, overwrite);

      if (result.success) {
        Alert.alert(
          'Import Successful',
          `Imported ${result.entriesAdded} food entries from ${result.datesAffected.length} days.\n\nDate range: ${result.datesAffected[0]} to ${result.datesAffected[result.datesAffected.length - 1]}`
        );
      } else {
        Alert.alert('Import Failed', result.error || 'Unknown error occurred');
      }

      setImportPreview(null);
      setImporting(false);
    } catch (error) {
      console.error('Error importing data:', error);
      Alert.alert('Error', 'Failed to import data. Please try again.');
      setImporting(false);
    }
  };

  const handleImportMacroFactorWeight = async () => {
    try {
      setImportingWeight(true);

      // Pick Excel file
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImportingWeight(false);
        return;
      }

      // Read file content as ArrayBuffer
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Generate preview
      const preview = await previewMacroFactorWeightImport(arrayBuffer);

      if (preview.totalEntries === 0) {
        Alert.alert('No Data', 'No valid weight entries found in the Excel file.');
        setImportingWeight(false);
        return;
      }

      // Show preview modal
      setWeightImportPreview({
        totalEntries: preview.totalEntries,
        dateRange: preview.dateRange,
        conflictingDates: preview.conflictingDates,
        fileContent: arrayBuffer,
      });
      setShowWeightImportPreview(true);
      setImportingWeight(false);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read Excel file. Please try again.');
      setImportingWeight(false);
    }
  };

  const handleConfirmWeightImport = async (overwrite: boolean) => {
    if (!weightImportPreview) return;

    try {
      setImportingWeight(true);
      setShowWeightImportPreview(false);

      const result = await importMacroFactorWeightLog(weightImportPreview.fileContent, overwrite);

      if (result.success) {
        Alert.alert(
          'Import Successful',
          `Imported ${result.entriesAdded} weight entries from ${result.datesAffected.length} days.\n\nDate range: ${result.datesAffected[0]} to ${result.datesAffected[result.datesAffected.length - 1]}`
        );
        await loadWeightEntries(); // Reload weight entries
      } else {
        Alert.alert('Import Failed', result.error || 'Unknown error occurred');
      }

      setWeightImportPreview(null);
      setImportingWeight(false);
    } catch (error) {
      console.error('Error importing weight data:', error);
      Alert.alert('Error', 'Failed to import weight data. Please try again.');
      setImportingWeight(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Units Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="resize-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Units</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose your preferred unit system for weight and height in the Goals screen.
            This setting does not affect food entries.
          </Text>

          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                units === 'imperial' && styles.optionButtonActive,
              ]}
              onPress={() => handleUnitsChange('imperial')}
            >
              <View style={styles.optionContent}>
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      units === 'imperial' && styles.optionTitleActive,
                    ]}
                  >
                    Imperial
                  </Text>
                  <Text style={styles.optionSubtext}>
                    Weight in lbs, Height in feet/inches
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                units === 'metric' && styles.optionButtonActive,
              ]}
              onPress={() => handleUnitsChange('metric')}
            >
              <View style={styles.optionContent}>
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      units === 'metric' && styles.optionTitleActive,
                    ]}
                  >
                    Metric
                  </Text>
                  <Text style={styles.optionSubtext}>
                    Weight in kg, Height in cm
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Food Database Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Offline Food Database</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which regional food database to use for offline food searches.
          </Text>

          <View style={styles.optionGroup}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                foodDatabase === 'US' && styles.optionButtonActive,
              ]}
              onPress={() => handleFoodDatabaseChange('US')}
            >
              <View style={styles.optionContent}>
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      foodDatabase === 'US' && styles.optionTitleActive,
                    ]}
                  >
                    United States (US)
                  </Text>
                  <Text style={styles.optionSubtext}>
                    USDA food database with common US foods
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                foodDatabase === 'PT' && styles.optionButtonActive,
              ]}
              onPress={() => handleFoodDatabaseChange('PT')}
            >
              <View style={styles.optionContent}>
                <View>
                  <Text
                    style={[
                      styles.optionTitle,
                      foodDatabase === 'PT' && styles.optionTitleActive,
                    ]}
                  >
                    Portugal (PT)
                  </Text>
                  <Text style={styles.optionSubtext}>
                    Portuguese food database with regional foods
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Logging Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>AI Food Logging</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Log meals from a photo or a text description. This is optional and uses your own OpenAI
            API key, which is stored only on this device and sent only to OpenAI. You pay OpenAI
            directly for what you use (typically a fraction of a cent per meal).
          </Text>
          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => {
              setApiKeyInput(openAIKey);
              setShowApiKeyModal(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.subscriptionButtonText}>OpenAI API Key</Text>
              <Text style={styles.sectionDescription}>{maskApiKey(openAIKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        {DONATION_URL !== '' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-outline" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Support okCal</Text>
            </View>
            <Text style={styles.sectionDescription}>
              okCal is free, has no ads, no account and no paywall. Your data never leaves your
              phone. If you find it useful and feel like it, you can chip in to help keep the
              project going.
            </Text>
            <TouchableOpacity style={styles.upgradeButton} onPress={handleDonate}>
              <Ionicons name="heart" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Donate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recipes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Recipes</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Create and manage your custom recipes with calculated nutritional information.
          </Text>

          <TouchableOpacity
            style={styles.recipesButton}
            onPress={() => navigation.navigate('Recipes')}
          >
            <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
            <Text style={styles.recipesButtonText}>My Recipes</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Export/Import Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Export/Import Data</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Export your data to CSV files for backup or import previously exported data to restore.
          </Text>

          <TouchableOpacity
            style={styles.recipesButton}
            onPress={() => navigation.navigate('ExportImport')}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
            <Text style={styles.recipesButtonText}>Manage Data</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Import External Data Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Import External Data</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Import food logs from other tracking apps. Currently supports MacroFactor CSV exports.
          </Text>

          {/* Food Log Import */}
          <TouchableOpacity
            style={styles.importCard}
            onPress={handleImportMacroFactor}
            disabled={importing}
          >
            <View style={styles.importCardHeader}>
              <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
              {importing ? (
                <ActivityIndicator color={Colors.primary} style={{ marginLeft: 12 }} />
              ) : (
                <Text style={styles.importCardTitle}>Import MacroFactor Food Log</Text>
              )}
            </View>
            <Text style={styles.importCardInfo}>
              Export your food log from MacroFactor as a CSV file, then select it here to import your data.
            </Text>
          </TouchableOpacity>

          {/* Weight Data Import */}
          <TouchableOpacity
            style={[styles.importCard, { marginTop: 12 }]}
            onPress={handleImportMacroFactorWeight}
            disabled={importingWeight}
          >
            <View style={styles.importCardHeader}>
              <Ionicons name="analytics-outline" size={24} color={Colors.primary} />
              {importingWeight ? (
                <ActivityIndicator color={Colors.primary} style={{ marginLeft: 12 }} />
              ) : (
                <Text style={styles.importCardTitle}>Import MacroFactor Weight (kg)</Text>
              )}
            </View>
            <Text style={styles.importCardInfo}>
              Export your weight data from MacroFactor as an Excel file, then select it here to import your weight history.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weight History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="scale-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Weight History</Text>
          </View>
          <Text style={styles.sectionDescription}>
            View, edit, delete, or add weight entries to your history.
          </Text>

          <TouchableOpacity style={styles.addButton} onPress={handleAddNewWeight}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Entry</Text>
          </TouchableOpacity>

          {weightEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scale-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No weight entries yet</Text>
            </View>
          ) : (
            <View style={styles.scrollContainer}>
              <ScrollView
                style={styles.entriesScrollView}
                contentContainerStyle={styles.entriesScrollContent}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                indicatorStyle="black"
                nestedScrollEnabled={true}
              >
              {weightEntries.map((entry) => {
                const displayWeight = units === 'metric'
                  ? kgFromLbs(entry.weight).toFixed(1)
                  : entry.weight.toFixed(1);
                const date = parseDate(entry.date);
                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryDate}>
                        {date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.entryWeight}>
                        {displayWeight} {units === 'metric' ? 'kg' : 'lbs'}
                      </Text>
                    </View>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditWeight(entry)}
                      >
                        <Ionicons name="pencil" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteWeight(entry)}
                      >
                        <Ionicons name="trash" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              </ScrollView>
              {/* Scroll indicator hint */}
              {weightEntries.length > 5 && (
                <View style={styles.scrollIndicatorHint}>
                  <Ionicons name="chevron-down" size={16} color="#999" />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Manage my Data Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Manage my Data</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Everything lives on this device. Use Export / Import above to back up or move your data.
          </Text>
          <TouchableOpacity
            style={styles.deleteDataButton}
            onPress={handleDeleteAllData}
          >
            <Ionicons name="trash-bin-outline" size={20} color="#FF3B30" />
            <Text style={[styles.deleteDataButtonText, { color: '#FF3B30' }]}>Delete All Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit/Add Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isAddingNew ? 'Add Weight Entry' : 'Edit Weight Entry'}
            </Text>

            <Text style={styles.modalLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="2024-01-01"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>
              Weight ({units === 'metric' ? 'kg' : 'lbs'})
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editWeight}
              onChangeText={setEditWeight}
              placeholder={units === 'metric' ? '70.0' : '154.0'}
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveWeight}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Food Import Preview Modal */}
      <Modal
        visible={showImportPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Food Import Preview</Text>

            {importPreview && (
              <>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewLabel}>Total Entries:</Text>
                  <Text style={styles.previewValue}>{importPreview.totalEntries}</Text>
                </View>

                {importPreview.dateRange && (
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewLabel}>Date Range:</Text>
                    <Text style={styles.previewValue}>
                      {importPreview.dateRange.start} to {importPreview.dateRange.end}
                    </Text>
                  </View>
                )}

                {importPreview.conflictingDates.length > 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={20} color="#FF9500" />
                    <Text style={styles.warningText}>
                      {importPreview.conflictingDates.length} days have existing data that will be affected.
                    </Text>
                  </View>
                )}

                <Text style={styles.overwriteQuestion}>
                  Do you want to overwrite existing entries for dates in this import?
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowImportPreview(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.mergeButton]}
                    onPress={() => handleConfirmImport(false)}
                  >
                    <Text style={styles.mergeButtonText}>Merge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.overwriteButton]}
                    onPress={() => handleConfirmImport(true)}
                  >
                    <Text style={styles.overwriteButtonText}>Overwrite</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Weight Import Preview Modal */}
      <Modal
        visible={showWeightImportPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeightImportPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Weight Import Preview</Text>

            {weightImportPreview && (
              <>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewLabel}>Total Entries:</Text>
                  <Text style={styles.previewValue}>{weightImportPreview.totalEntries}</Text>
                </View>

                {weightImportPreview.dateRange && (
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewLabel}>Date Range:</Text>
                    <Text style={styles.previewValue}>
                      {weightImportPreview.dateRange.start} to {weightImportPreview.dateRange.end}
                    </Text>
                  </View>
                )}

                {weightImportPreview.conflictingDates.length > 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={20} color="#FF9500" />
                    <Text style={styles.warningText}>
                      {weightImportPreview.conflictingDates.length} days have existing data that will be affected.
                    </Text>
                  </View>
                )}

                <Text style={styles.overwriteQuestion}>
                  Do you want to overwrite existing entries for dates in this import?
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowWeightImportPreview(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.mergeButton]}
                    onPress={() => handleConfirmWeightImport(false)}
                  >
                    <Text style={styles.mergeButtonText}>Merge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.overwriteButton]}
                    onPress={() => handleConfirmWeightImport(true)}
                  >
                    <Text style={styles.overwriteButtonText}>Overwrite</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Loading Modal for Import Operations */}
      <Modal
        visible={importing || importingWeight}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>
              {importing ? 'Importing Food Logs...' : 'Importing Weight Data...'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              This may take a moment for large datasets.{'\n'}
              Please do not close the app.
            </Text>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <Modal
        visible={showApiKeyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>OpenAI API Key</Text>
              <TouchableOpacity onPress={() => setShowApiKeyModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Create a key at platform.openai.com/api-keys</Text>
            <TextInput
              style={styles.passwordInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="sk-..."
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors.primary }]}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.deleteButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionGroup: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#E8F4FF',
    borderColor: Colors.primary,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: Colors.primary,
  },
  optionSubtext: {
    fontSize: 13,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  recipesButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recipesButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  entriesList: {
    gap: 12,
  },
  scrollContainer: {
    position: 'relative',
  },
  entriesScrollView: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  entriesScrollContent: {
    padding: 12,
    gap: 12,
  },
  scrollIndicatorHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  entryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  entryWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  importCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  importCardTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  importCardInfo: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  previewInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 18,
  },
  overwriteQuestion: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  mergeButton: {
    backgroundColor: '#34C759',
  },
  mergeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overwriteButton: {
    backgroundColor: '#FF9500',
  },
  overwriteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  subscriptionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteDataButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF9500',
    marginTop: 8,
    gap: 8,
  },
  deleteDataButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
