import React, { useState } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackScreenProps } from '@/navigation/types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  exportLoggedWeight,
  exportTrendWeight,
  exportCalorieMacros,
  exportLoggedFood,
  importLoggedWeight,
  importLoggedFood,
  ExportDataset,
} from '@/services/exportImportService';

type DatasetOption = {
  id: ExportDataset;
  title: string;
  description: string;
  icon: string;
  exportable: boolean;
  importable: boolean;
};

const DATASETS: DatasetOption[] = [
  {
    id: 'logged_weight',
    title: 'Logged Weight',
    description: 'Your daily weight measurements',
    icon: 'scale-outline',
    exportable: true,
    importable: true,
  },
  {
    id: 'trend_weight',
    title: 'Trend Weight',
    description: 'Smoothed weight trend (calculated)',
    icon: 'trending-up-outline',
    exportable: true,
    importable: false,
  },
  {
    id: 'calorie_macros',
    title: 'Calorie & Macro Intake',
    description: 'Daily totals for calories and macros',
    icon: 'flame-outline',
    exportable: true,
    importable: false,
  },
  {
    id: 'logged_food',
    title: 'Logged Food',
    description: 'All food entries with timestamps',
    icon: 'restaurant-outline',
    exportable: true,
    importable: true,
  },
];

export default function ExportImportScreen({ navigation }: RootStackScreenProps<'ExportImport'>) {
  const [exporting, setExporting] = useState<ExportDataset | null>(null);
  const [importing, setImporting] = useState<ExportDataset | null>(null);

  const handleExport = async (datasetId: ExportDataset) => {
    setExporting(datasetId);

    try {
      let result;

      switch (datasetId) {
        case 'logged_weight':
          result = await exportLoggedWeight();
          break;
        case 'trend_weight':
          result = await exportTrendWeight();
          break;
        case 'calorie_macros':
          result = await exportCalorieMacros();
          break;
        case 'logged_food':
          result = await exportLoggedFood();
          break;
      }

      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
        setExporting(null);
        return;
      }

      // Save file to device
      const fileUri = `${FileSystem.documentDirectory}${result.filename}`;
      await FileSystem.writeAsStringAsync(fileUri, result.csvContent!, {
        encoding: 'utf8',
      });

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }

      setExporting(null);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting data');
      setExporting(null);
    }
  };

  const handleImport = async (datasetId: ExportDataset) => {
    try {
      // Pick CSV file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setImporting(datasetId);

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: 'utf8',
      });

      // Ask about overwrite
      Alert.alert(
        'Import Options',
        'How do you want to handle existing data?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setImporting(null),
          },
          {
            text: 'Skip Duplicates',
            onPress: () => performImport(datasetId, fileContent, false),
          },
          {
            text: 'Overwrite',
            style: 'destructive',
            onPress: () => performImport(datasetId, fileContent, true),
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Import Failed', 'Failed to read the selected file');
      setImporting(null);
    }
  };

  const performImport = async (
    datasetId: ExportDataset,
    fileContent: string,
    overwrite: boolean
  ) => {
    try {
      let result;

      switch (datasetId) {
        case 'logged_weight':
          result = await importLoggedWeight(fileContent, overwrite);
          break;
        case 'logged_food':
          result = await importLoggedFood(fileContent, overwrite);
          break;
        default:
          Alert.alert('Import Not Supported', 'This dataset cannot be imported');
          setImporting(null);
          return;
      }

      if (!result.success) {
        Alert.alert('Import Failed', result.error || 'Unknown error occurred');
        setImporting(null);
        return;
      }

      Alert.alert(
        'Import Complete',
        `Added: ${result.entriesAdded} entries\nSkipped: ${result.entriesSkipped} entries`
      );

      setImporting(null);
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Import Failed', 'An error occurred while importing data');
      setImporting(null);
    }
  };

  const renderDataset = (dataset: DatasetOption) => {
    const isExporting = exporting === dataset.id;
    const isImporting = importing === dataset.id;
    const isLoading = isExporting || isImporting;

    return (
      <View key={dataset.id} style={styles.datasetCard}>
        <View style={styles.datasetHeader}>
          <View style={styles.datasetIcon}>
            <Ionicons name={dataset.icon as any} size={24} color={Colors.primary} />
          </View>
          <View style={styles.datasetInfo}>
            <Text style={styles.datasetTitle}>{dataset.title}</Text>
            <Text style={styles.datasetDescription}>{dataset.description}</Text>
          </View>
        </View>

        <View style={styles.datasetActions}>
          {dataset.exportable && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.exportButton,
                isLoading && styles.actionButtonDisabled,
              ]}
              onPress={() => handleExport(dataset.id)}
              disabled={isLoading}
            >
              {isExporting ? (
                <Text style={styles.exportButtonText}>Exporting...</Text>
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={Colors.primary} />
                  <Text style={styles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {dataset.importable && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.importButton,
                isLoading && styles.actionButtonDisabled,
              ]}
              onPress={() => handleImport(dataset.id)}
              disabled={isLoading}
            >
              {isImporting ? (
                <Text style={styles.importButtonText}>Importing...</Text>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.importButtonText}>Import</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export/Import Data</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Export your data as CSV files to back up or analyze in other apps. Import previously
            exported files to restore your data.
          </Text>
        </View>

        {/* Datasets */}
        <View style={styles.datasetsContainer}>
          {DATASETS.map(renderDataset)}
        </View>
      </ScrollView>

      {/* Loading Modal for Large Imports */}
      <Modal
        visible={importing !== null}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.modalTitle}>Importing Data...</Text>
            <Text style={styles.modalSubtitle}>
              This may take a moment for large datasets.{'\n'}
              Please do not close the app.
            </Text>
          </View>
        </View>
      </Modal>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e6f3ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  datasetsContainer: {
    padding: 16,
    gap: 12,
  },
  datasetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  datasetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  datasetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datasetInfo: {
    flex: 1,
  },
  datasetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  datasetDescription: {
    fontSize: 13,
    color: '#666',
  },
  datasetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  exportButton: {
    backgroundColor: '#e6f3ff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  importButton: {
    backgroundColor: Colors.primary,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
