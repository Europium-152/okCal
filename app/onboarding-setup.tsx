import React, { useState } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RootStackScreenProps } from '@/navigation/types';
import { saveAppSettings, saveUserProfile, saveWeightEntry } from '@/utils/storage';
import { Units, FoodDatabase, Sex, UserProfile, WeightEntry } from '@/types';
import { lbsFromKg, cmFromInches, MAX_RATE_LBS_PER_WEEK, MAX_RATE_KG_PER_WEEK } from '@/constants/nutrition';
import { getTodayString, formatDate, parseDate } from '@/utils/dateHelpers';

const getDateYearsAgo = (years: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

const MIN_BIRTH_DATE = getDateYearsAgo(120);
const MAX_BIRTH_DATE = getDateYearsAgo(13);
const DEFAULT_BIRTH_DATE = getDateYearsAgo(25);

type OnboardingStep = 'units' | 'database' | 'profile' | 'goals';

export default function OnboardingSetup({ navigation }: RootStackScreenProps<'OnboardingSetup'>) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('units');
  const [isSaving, setIsSaving] = useState(false);

  // Settings
  const [units, setUnits] = useState<Units>('imperial');
  const [foodDatabase, setFoodDatabase] = useState<FoodDatabase>('US');

  // Profile
  const [sex, setSex] = useState<Sex>('male');
  const [birthDate, setBirthDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState<Date>(DEFAULT_BIRTH_DATE);
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');

  // Goals
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalRate, setGoalRate] = useState('');

  const steps: OnboardingStep[] = ['units', 'database', 'profile', 'goals'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep === 'units') {
      setCurrentStep('database');
    } else if (currentStep === 'database') {
      setCurrentStep('profile');
    } else if (currentStep === 'profile') {
      if (!validateProfile()) return;
      setCurrentStep('goals');
    } else if (currentStep === 'goals') {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep === 'database') {
      setCurrentStep('units');
    } else if (currentStep === 'profile') {
      setCurrentStep('database');
    } else if (currentStep === 'goals') {
      setCurrentStep('profile');
    }
  };

  const openDatePicker = () => {
    setTempBirthDate(birthDate ? parseDate(birthDate) : DEFAULT_BIRTH_DATE);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setBirthDate(formatDate(selectedDate));
      }
      return;
    }
    // iOS spinner reports intermediate values as the user scrolls; stage them
    // until "Done" is tapped.
    if (selectedDate) {
      setTempBirthDate(selectedDate);
    }
  };

  const confirmIosDate = () => {
    setBirthDate(formatDate(tempBirthDate));
    setShowDatePicker(false);
  };

  const cancelIosDate = () => {
    setShowDatePicker(false);
  };

  const validateProfile = (): boolean => {
    // Birth date is picked via a native date picker constrained to the 13-120 age
    // range (see MIN_BIRTH_DATE/MAX_BIRTH_DATE), so only presence needs checking here.
    if (!birthDate) {
      Alert.alert('Missing Birth Date', 'Please select your birth date');
      return false;
    }

    // Validate height
    if (units === 'imperial') {
      const feet = parseFloat(heightFeet);
      const inches = parseFloat(heightInches);
      if (!feet || feet < 3 || feet > 8 || isNaN(inches) || inches < 0 || inches >= 12) {
        Alert.alert('Invalid Height', 'Please enter a valid height');
        return false;
      }
    } else {
      const cm = parseFloat(heightCm);
      if (!cm || cm < 100 || cm > 250) {
        Alert.alert('Invalid Height', 'Please enter a valid height (100-250 cm)');
        return false;
      }
    }

    return true;
  };

  const validateGoals = (): boolean => {
    const weight = parseFloat(currentWeight);
    const target = parseFloat(targetWeight);

    if (!weight || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter your current weight');
      return false;
    }

    if (!target || target <= 0) {
      Alert.alert('Invalid Target', 'Please enter your target weight');
      return false;
    }

    const rate = parseFloat(goalRate);
    if (!rate || rate <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a positive rate of weight change');
      return false;
    }

    // The cap is always 1 kg/week in absolute terms, so convert to lbs
    // before comparing regardless of which units the user entered it in.
    const rateLbs = units === 'metric' ? lbsFromKg(rate) : rate;
    if (rateLbs > MAX_RATE_LBS_PER_WEEK) {
      Alert.alert(
        'Rate Too High',
        `For safety, the rate of weight change can't exceed ${MAX_RATE_KG_PER_WEEK} kg (${MAX_RATE_LBS_PER_WEEK.toFixed(1)} lb) per week.`
      );
      return false;
    }

    return true;
  };

  const handleFinish = async () => {
    if (!validateGoals()) return;
    if (isSaving) return; // Prevent multiple saves

    setIsSaving(true);
    try {
      // Save app settings (OFF search region defaults to US; adjustable later in Settings)
      await saveAppSettings({ units, foodDatabase, offSearchRegion: 'US' });

      // Calculate height in cm
      let heightInCm: number;
      if (units === 'imperial') {
        const totalInches = parseFloat(heightFeet) * 12 + parseFloat(heightInches);
        heightInCm = cmFromInches(totalInches);
      } else {
        heightInCm = parseFloat(heightCm);
      }

      // Calculate weights in lbs
      let currentWeightLbs: number;
      let targetWeightLbs: number;
      if (units === 'metric') {
        currentWeightLbs = lbsFromKg(parseFloat(currentWeight));
        targetWeightLbs = lbsFromKg(parseFloat(targetWeight));
      } else {
        currentWeightLbs = parseFloat(currentWeight);
        targetWeightLbs = parseFloat(targetWeight);
      }

      // Max rate of weight change, in lbs/week (always positive; the
      // calculator infers direction and tapers the rate near the target).
      const maxRateLbs =
        units === 'metric' ? lbsFromKg(parseFloat(goalRate)) : parseFloat(goalRate);

      // Create user profile
      const profile: UserProfile = {
        id: `profile_${Date.now()}`,
        sex,
        birthDate,
        heightCm: heightInCm,
        targetWeightLbs,
        maxRatePerWeek: maxRateLbs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(profile);

      // Save initial weight entry using today's date (local timezone)
      const today = getTodayString(); // YYYY-MM-DD format in local timezone
      const initialWeightEntry: WeightEntry = {
        id: `weight_${Date.now()}`,
        date: today,
        weight: currentWeightLbs,
        timestamp: Date.now(),
      };
      await saveWeightEntry(initialWeightEntry);

      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert('Error', 'Failed to save your settings. Please try again.');
      setIsSaving(false); // Re-enable button on error
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStepIndex + 1} of {steps.length}
      </Text>
    </View>
  );

  const renderUnitsStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="resize-outline" size={48} color="#4ECDC4" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Choose Your Units</Text>
      <Text style={styles.stepSubtitle}>
        Select your preferred measurement system
      </Text>

      <View style={styles.optionGroup}>
        <TouchableOpacity
          style={[styles.optionCard, units === 'imperial' && styles.optionCardActive]}
          onPress={() => setUnits('imperial')}
        >
          <View style={styles.optionContent}>
            <View>
              <Text style={[styles.optionTitle, units === 'imperial' && styles.optionTitleActive]}>
                Imperial
              </Text>
              <Text style={styles.optionSubtext}>
                Weight in lbs, Height in feet/inches
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, units === 'metric' && styles.optionCardActive]}
          onPress={() => setUnits('metric')}
        >
          <View style={styles.optionContent}>
            <View>
              <Text style={[styles.optionTitle, units === 'metric' && styles.optionTitleActive]}>
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
  );

  const renderDatabaseStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="restaurant-outline" size={48} color="#4ECDC4" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Choose Food Database</Text>
      <Text style={styles.stepSubtitle}>
        Select your regional food database for offline searches
      </Text>

      <View style={styles.optionGroup}>
        <TouchableOpacity
          style={[styles.optionCard, foodDatabase === 'US' && styles.optionCardActive]}
          onPress={() => setFoodDatabase('US')}
        >
          <View style={styles.optionContent}>
            <View>
              <Text style={[styles.optionTitle, foodDatabase === 'US' && styles.optionTitleActive]}>
                United States (US)
              </Text>
              <Text style={styles.optionSubtext}>
                USDA food database with common US foods
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, foodDatabase === 'PT' && styles.optionCardActive]}
          onPress={() => setFoodDatabase('PT')}
        >
          <View style={styles.optionContent}>
            <View>
              <Text style={[styles.optionTitle, foodDatabase === 'PT' && styles.optionTitleActive]}>
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
  );

  const renderProfileStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="person-outline" size={48} color="#4ECDC4" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Your Profile</Text>
      <Text style={styles.stepSubtitle}>
        Tell us about yourself
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, sex === 'male' && styles.segmentActive]}
            onPress={() => setSex('male')}
          >
            <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, sex === 'female' && styles.segmentActive]}
            onPress={() => setSex('female')}
          >
            <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Birth Date</Text>
        <TouchableOpacity style={styles.input} onPress={openDatePicker}>
          <Text style={birthDate ? styles.dateValueText : styles.dateValuePlaceholder}>
            {birthDate
              ? parseDate(birthDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Select your birth date'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={birthDate ? parseDate(birthDate) : DEFAULT_BIRTH_DATE}
            mode="date"
            display="default"
            maximumDate={MAX_BIRTH_DATE}
            minimumDate={MIN_BIRTH_DATE}
            onChange={handleDateChange}
          />
        )}

        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={cancelIosDate}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerSheet}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={cancelIosDate}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmIosDate}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempBirthDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  maximumDate={MAX_BIRTH_DATE}
                  minimumDate={MIN_BIRTH_DATE}
                  onChange={handleDateChange}
                />
              </View>
            </View>
          </Modal>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Height {units === 'imperial' ? '(ft / in)' : '(cm)'}
        </Text>
        {units === 'imperial' ? (
          <View style={styles.heightRow}>
            <TextInput
              style={[styles.input, styles.heightInput]}
              value={heightFeet}
              onChangeText={setHeightFeet}
              placeholder="Feet"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            <Text style={styles.heightSeparator}>ft</Text>
            <TextInput
              style={[styles.input, styles.heightInput]}
              value={heightInches}
              onChangeText={setHeightInches}
              placeholder="Inches"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            <Text style={styles.heightSeparator}>in</Text>
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="170"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        )}
      </View>
    </View>
  );

  const renderGoalsStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="flag-outline" size={48} color="#4ECDC4" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Your Goals</Text>
      <Text style={styles.stepSubtitle}>
        Set your nutrition goals
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Current Weight ({units === 'metric' ? 'kg' : 'lbs'})
        </Text>
        <TextInput
          style={styles.input}
          value={currentWeight}
          onChangeText={setCurrentWeight}
          placeholder={units === 'metric' ? '70' : '154'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Target Weight ({units === 'metric' ? 'kg' : 'lbs'})
        </Text>
        <TextInput
          style={styles.input}
          value={targetWeight}
          onChangeText={setTargetWeight}
          placeholder={units === 'metric' ? '65' : '143'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Max Rate of Change ({units === 'metric' ? 'kg' : 'lbs'} per week)
        </Text>
        <TextInput
          style={styles.input}
          value={goalRate}
          onChangeText={setGoalRate}
          placeholder={units === 'metric' ? '0.25' : '0.5'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>
          Choose a value up to {units === 'imperial' ? MAX_RATE_LBS_PER_WEEK.toFixed(1) : MAX_RATE_KG_PER_WEEK}{' '}
                    {units === 'imperial' ? 'lb' : 'kg'}/week. 
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoBoxText}>
          Large rates of weight change can be unhealthy and unsustainable. 
            If you are unsure, we recommend starting with a moderate rate like {units === 'imperial' ? '0.5 lb' : '0.25 kg'}. 
            The app automatically adjust this value as you get close to your target weight. 
        </Text>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'units':
        return renderUnitsStep();
      case 'database':
        return renderDatabaseStep();
      case 'profile':
        return renderProfileStep();
      case 'goals':
        return renderGoalsStep();
    }
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStepIndex > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            currentStepIndex === 0 && styles.nextButtonFull,
            isSaving && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={isSaving}
        >
          <Text style={styles.nextButtonText}>
            {isSaving ? 'Saving...' : (currentStep === 'goals' ? 'Finish' : 'Continue')}
          </Text>
          {!isSaving && <Ionicons name="arrow-forward" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  optionGroup: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  optionCardActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F0FFFE',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: '#4ECDC4',
  },
  optionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  dateValueText: {
    fontSize: 16,
    color: '#333',
  },
  dateValuePlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#999',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#4ECDC4',
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heightInput: {
    flex: 1,
  },
  heightSeparator: {
    fontSize: 16,
    color: '#666',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoBoxBold: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
