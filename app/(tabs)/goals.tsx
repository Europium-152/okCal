import React, { useState, useEffect } from 'react';
import { Colors } from '@/constants/colors';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getUserProfile, saveUserProfile, getAppSettings } from '@/utils/storage';
import { UserProfile, Sex, Units } from '@/types';
import {
  cmFromFeet,
  lbsFromKg,
  kgFromLbs,
  cmFromInches,
  MAX_RATE_LBS_PER_WEEK,
  MAX_RATE_KG_PER_WEEK,
} from '@/constants/nutrition';
import { parseDecimal } from '@/utils/parseDecimal';

export default function GoalsScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [units, setUnits] = useState<Units>('imperial');

  // Form fields
  const [sex, setSex] = useState<Sex>('male');
  const [birthDate, setBirthDate] = useState('');
  // Imperial
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  // Metric
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalRate, setGoalRate] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const settings = await getAppSettings();
      setUnits(settings.units);

      const savedProfile = await getUserProfile();
      if (savedProfile) {
        setProfile(savedProfile);
        // Populate form with saved values
        setSex(savedProfile.sex);
        setBirthDate(savedProfile.birthDate);

        if (settings.units === 'imperial') {
          // Convert height from cm to feet/inches
          const totalInches = savedProfile.heightCm / 2.54;
          const feet = Math.floor(totalInches / 12);
          const inches = Math.round(totalInches % 12);
          setHeightFeet(feet.toString());
          setHeightInches(inches.toString());

          // Weight in lbs
          setTargetWeight(savedProfile.targetWeightLbs.toString());
          setGoalRate(savedProfile.maxRatePerWeek.toString());
        } else {
          // Height in cm
          setHeightCm(Math.round(savedProfile.heightCm).toString());

          // Weight in kg
          const targetWeightKg = kgFromLbs(savedProfile.targetWeightLbs);
          setTargetWeight(targetWeightKg.toFixed(1));

          const goalRateKg = kgFromLbs(savedProfile.maxRatePerWeek);
          setGoalRate(goalRateKg.toFixed(2));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAndSave = async () => {
    // Validate birth date
    if (!birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Please enter birth date in YYYY-MM-DD format');
      return;
    }

    let heightInCm: number;

    if (units === 'imperial') {
      // Validate height (imperial)
      const feet = parseInt(heightFeet);
      const inches = parseInt(heightInches);
      if (isNaN(feet) || feet < 0 || isNaN(inches) || inches < 0 || inches >= 12) {
        Alert.alert('Invalid Height', 'Please enter valid height values');
        return;
      }
      heightInCm = cmFromFeet(feet, inches);
    } else {
      // Validate height (metric)
      const cm = parseDecimal(heightCm);
      if (isNaN(cm) || cm <= 0 || cm > 300) {
        Alert.alert('Invalid Height', 'Please enter a valid height in cm (1-300)');
        return;
      }
      heightInCm = cm;
    }

    // Validate target weight
    const targetWeightNum = parseDecimal(targetWeight);
    if (isNaN(targetWeightNum) || targetWeightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid target weight');
      return;
    }

    // Validate max rate of change (always positive; direction is inferred
    // from current vs. target weight, not chosen by the user)
    const goalRateNum = parseDecimal(goalRate);
    if (!goalRateNum || goalRateNum <= 0) {
      Alert.alert('Invalid Rate', 'Please enter a positive rate of weight change');
      return;
    }

    // The cap is always 1 kg/week in absolute terms, so convert to lbs
    // before comparing regardless of which units the user entered it in.
    const goalRateLbsForCapCheck = units === 'metric' ? lbsFromKg(goalRateNum) : goalRateNum;
    if (goalRateLbsForCapCheck > MAX_RATE_LBS_PER_WEEK) {
      Alert.alert(
        'Rate Too High',
        `For safety, the rate of weight change can't exceed ${MAX_RATE_KG_PER_WEEK} kg (${MAX_RATE_LBS_PER_WEEK.toFixed(1)} lb) per week.`
      );
      return;
    }

    try {
      // Convert to internal units (lbs) if needed
      const targetWeightLbs = units === 'metric' ? lbsFromKg(targetWeightNum) : targetWeightNum;
      const maxRatePerWeek = units === 'metric' ? lbsFromKg(goalRateNum) : goalRateNum;

      const now = new Date().toISOString();

      const newProfile: UserProfile = {
        id: profile?.id || `profile_${Date.now()}`,
        sex,
        birthDate,
        heightCm: heightInCm,
        targetWeightLbs,
        maxRatePerWeek,
        createdAt: profile?.createdAt || now,
        updatedAt: now,
      };

      await saveUserProfile(newProfile);
      setProfile(newProfile);
      Alert.alert('Success', 'Your profile has been saved!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
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
        <Text style={styles.title}>Goals & Profile</Text>
        <Text style={styles.subtitle}>
          Set your profile and goals to get personalized calorie recommendations
        </Text>

        {/* Sex */}
        <Text style={styles.label}>Sex</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, sex === 'male' && styles.buttonActive]}
            onPress={() => setSex('male')}
          >
            <Text style={[styles.buttonText, sex === 'male' && styles.buttonTextActive]}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, sex === 'female' && styles.buttonActive]}
            onPress={() => setSex('female')}
          >
            <Text style={[styles.buttonText, sex === 'female' && styles.buttonTextActive]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>

        {/* Birth Date */}
        <Text style={styles.label}>Birth Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-01-01"
          placeholderTextColor="#999"
        />

        {/* Height */}
        <Text style={styles.label}>
          Height {units === 'imperial' ? '(feet/inches)' : '(cm)'}
        </Text>
        {units === 'imperial' ? (
          <View style={styles.row}>
            <View style={styles.heightInput}>
              <TextInput
                style={styles.input}
                value={heightFeet}
                onChangeText={setHeightFeet}
                placeholder="Feet"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.heightInput}>
              <TextInput
                style={styles.input}
                value={heightInches}
                onChangeText={setHeightInches}
                placeholder="Inches"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="170"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        )}

        {/* Target Weight */}
        <Text style={styles.label}>
          Target Weight ({units === 'imperial' ? 'lbs' : 'kg'})
        </Text>
        <TextInput
          style={styles.input}
          value={targetWeight}
          onChangeText={setTargetWeight}
          placeholder={units === 'imperial' ? '150' : '68.0'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />

        {/* Max Rate of Change */}
        <Text style={styles.label}>
          Max Rate of Weight Change ({units === 'imperial' ? 'lbs' : 'kg'} per week)
        </Text>
        <TextInput
          style={styles.input}
          value={goalRate}
          onChangeText={setGoalRate}
          placeholder={units === 'imperial' ? '1.0' : '0.45'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>
          Choose a value up to {units === 'imperial' ? MAX_RATE_LBS_PER_WEEK.toFixed(1) : MAX_RATE_KG_PER_WEEK}{' '}
          {units === 'imperial' ? 'lb' : 'kg'}/week. 
        </Text>

        {/* Goal explanation */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoBoxText}>
            Large rates of weight change can be unhealthy and unsustainable. 
            If you are unsure, we recommend starting with a moderate rate like {units === 'imperial' ? '0.5 lb' : '0.25 kg'}. 
            The app automatically adjust this value as you get close to your target weight. 
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>

        {profile && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Profile last updated: {new Date(profile.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
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
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInput: {
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  buttonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#B3D9FF',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  infoBoxBold: {
    fontWeight: '600',
    color: '#000',
  },
});
