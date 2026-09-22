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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackScreenProps } from '@/navigation/types';
import { saveAppSettings, saveUserProfile, saveWeightEntry } from '@/utils/storage';
import { Units, FoodDatabase, Sex, Goal, UserProfile, WeightEntry } from '@/types';
import { lbsFromKg, cmFromInches } from '@/constants/nutrition';
import { getTodayString } from '@/utils/dateHelpers';

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
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');

  // Goals
  const [goal, setGoal] = useState<Goal>('maintain');
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

  const validateProfile = (): boolean => {
    // Validate birth date (YYYY-MM-DD format)
    if (!birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Please enter your birth date in YYYY-MM-DD format');
      return false;
    }

    // Validate age (must be between 13 and 120)
    const birthYear = parseInt(birthDate.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < 13 || age > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid birth date');
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

    // Only validate rate for lose/gain goals
    if (goal !== 'maintain') {
      const rate = parseFloat(goalRate);

      if (!rate || rate <= 0) {
        Alert.alert('Invalid Goal Rate', 'Please enter a positive goal rate');
        return false;
      }
    }

    return true;
  };

  const handleFinish = async () => {
    if (!validateGoals()) return;
    if (isSaving) return; // Prevent multiple saves

    setIsSaving(true);
    try {
      // Save app settings
      await saveAppSettings({ units, foodDatabase });

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

      // Calculate goal rate in lbs per week
      let goalRateLbs: number;
      if (goal === 'maintain') {
        goalRateLbs = 0;
      } else {
        // Convert to lbs (rate is always entered as positive)
        if (units === 'metric') {
          goalRateLbs = lbsFromKg(parseFloat(goalRate));
        } else {
          goalRateLbs = parseFloat(goalRate);
        }

        // Make goal rate negative for weight loss
        if (goal === 'lose') {
          goalRateLbs = -Math.abs(goalRateLbs);
        } else {
          // Ensure positive for weight gain
          goalRateLbs = Math.abs(goalRateLbs);
        }
      }

      // Create user profile
      const profile: UserProfile = {
        id: `profile_${Date.now()}`,
        sex,
        birthDate,
        heightCm: heightInCm,
        goal,
        targetWeightLbs,
        goalRatePerWeek: goalRateLbs,
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
        <Text style={styles.label}>Birth Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-01-01"
          placeholderTextColor="#999"
          keyboardType="numbers-and-punctuation"
        />
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
        <Text style={styles.label}>What's your goal?</Text>
        <View style={styles.goalButtons}>
          <TouchableOpacity
            style={[styles.goalButton, goal === 'lose' && styles.goalButtonActive]}
            onPress={() => setGoal('lose')}
          >
            <Ionicons
              name="trending-down"
              size={24}
              color={goal === 'lose' ? '#fff' : '#4ECDC4'}
            />
            <Text style={[styles.goalButtonText, goal === 'lose' && styles.goalButtonTextActive]}>
              Lose Weight
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.goalButton, goal === 'maintain' && styles.goalButtonActive]}
            onPress={() => setGoal('maintain')}
          >
            <Ionicons
              name="remove"
              size={24}
              color={goal === 'maintain' ? '#fff' : '#4ECDC4'}
            />
            <Text style={[styles.goalButtonText, goal === 'maintain' && styles.goalButtonTextActive]}>
              Maintain
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.goalButton, goal === 'gain' && styles.goalButtonActive]}
            onPress={() => setGoal('gain')}
          >
            <Ionicons
              name="trending-up"
              size={24}
              color={goal === 'gain' ? '#fff' : '#4ECDC4'}
            />
            <Text style={[styles.goalButtonText, goal === 'gain' && styles.goalButtonTextActive]}>
              Gain Weight
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {goal !== 'maintain' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Goal Rate ({units === 'metric' ? 'kg' : 'lbs'} per week)
          </Text>
          <TextInput
            style={styles.input}
            value={goalRate}
            onChangeText={setGoalRate}
            placeholder={
              goal === 'lose'
                ? units === 'metric' ? '0.5' : '1'
                : units === 'metric' ? '0.25' : '0.5'
            }
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>
            {goal === 'lose'
              ? 'Recommended: 0.5 to 1 kg/week (1 to 2 lbs/week)'
              : 'Recommended: 0.25 to 0.5 kg/week (0.5 to 1 lb/week)'}
          </Text>
        </View>
      )}

      {/* Lose weight goal explanation */}
      {goal === 'lose' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoBoxText}>
            The app will automatically adjust your calorie recommendations to help you lose weight safely.
            {'\n\n'}
            <Text style={styles.infoBoxBold}>Recommended rate:</Text> {units === 'imperial' ? '1-2 lbs' : '0.5-1 kg'} per week (deficit of 500-1000 calories/day).
            Slower rates ({units === 'imperial' ? '0.5-1 lb' : '0.25-0.5 kg'}/week) help maximize muscle retention.
            {'\n\n'}
            <Text style={styles.infoBoxBold}>Why it matters:</Text> Very rapid weight loss increases risk of muscle loss, nutrient deficiencies, and makes weight regain more likely.
          </Text>
        </View>
      )}

      {/* Gain weight goal explanation */}
      {goal === 'gain' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoBoxText}>
            The app will automatically adjust your calorie recommendations to help you gain weight and build muscle.
            {'\n\n'}
            <Text style={styles.infoBoxBold}>Recommended rate:</Text> {units === 'imperial' ? '0.5-1 lb' : '0.25-0.5 kg'} per week (surplus of 250-500 calories/day) combined with resistance training.
            {'\n\n'}
            <Text style={styles.infoBoxBold}>Why it matters:</Text> Modest rates minimize fat accumulation while building lean muscle. Beginners may gain faster initially, while trained individuals need slower, consistent progress.
          </Text>
        </View>
      )}

      {/* Maintain goal explanation */}
      {goal === 'maintain' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoBoxText}>
            The app will automatically adjust your calorie recommendations to help you maintain
            your target weight. If your weight deviates, the algorithm will make small adjustments
            (within ±{units === 'imperial' ? '0.4' : '0.2'} {units === 'imperial' ? 'lbs' : 'kg'} per week) to bring you back to your target.
          </Text>
        </View>
      )}
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
  goalButtons: {
    gap: 12,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 12,
  },
  goalButtonActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#4ECDC4',
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  goalButtonTextActive: {
    color: '#fff',
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
