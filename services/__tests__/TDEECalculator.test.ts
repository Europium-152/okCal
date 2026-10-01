import { TDEECalculator } from '@/services/TDEECalculator';
import { UserProfile, WeightEntry } from '@/types';
import { CALORIES_PER_LB_PER_WEEK, MAX_RATE_LBS_PER_WEEK } from '@/constants/nutrition';

const REFERENCE_DATE = new Date('2024-06-15T00:00:00');

const baseProfile: Omit<UserProfile, 'targetWeightLbs' | 'maxRatePerWeek'> = {
  id: 'profile_1',
  sex: 'male',
  birthDate: '1990-01-01',
  heightCm: 180,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function buildProfile(targetWeightLbs: number, maxRatePerWeek: number): UserProfile {
  return { ...baseProfile, targetWeightLbs, maxRatePerWeek };
}

function buildCalculator(currentWeight: number, profile: UserProfile): TDEECalculator {
  const weightEntries: WeightEntry[] = [
    { id: 'w1', date: '2024-06-15', weight: currentWeight, timestamp: REFERENCE_DATE.getTime() },
  ];
  return new TDEECalculator(profile, weightEntries, [], [], new Date(REFERENCE_DATE));
}

function getDeficitOrSurplus(currentWeight: number, profile: UserProfile): number {
  const calculator = buildCalculator(currentWeight, profile);
  const estimate = calculator.calculateTDEEEstimate()!;
  const target = calculator.calculateNutritionTarget(estimate);
  return target.deficitOrSurplus;
}

describe('TDEECalculator.calculateNutritionTarget adaptive rate', () => {
  it('uses the full max rate when far from target (losing)', () => {
    const profile = buildProfile(150, 1); // target 150 lbs, cap 1 lb/week
    const deficitOrSurplus = getDeficitOrSurplus(180, profile); // 30 lbs away
    expect(deficitOrSurplus).toBeCloseTo(-1 * CALORIES_PER_LB_PER_WEEK, 0);
  });

  it('uses the full max rate when far from target (gaining)', () => {
    const profile = buildProfile(180, 1); // target 180 lbs, cap 1 lb/week
    const deficitOrSurplus = getDeficitOrSurplus(150, profile); // 30 lbs away
    expect(deficitOrSurplus).toBeCloseTo(1 * CALORIES_PER_LB_PER_WEEK, 0);
  });

  it('tapers the rate linearly as the user approaches target (losing)', () => {
    const profile = buildProfile(150, 1); // f = 1 week, so taper starts within 1 lb of target
    const deficitOrSurplus = getDeficitOrSurplus(150.5, profile); // 0.5 lbs away
    // r = diff / f = -0.5 lbs/week
    expect(deficitOrSurplus).toBeCloseTo(-0.5 * CALORIES_PER_LB_PER_WEEK, 0);
  });

  it('tapers the rate linearly as the user approaches target (gaining)', () => {
    const profile = buildProfile(150, 1);
    const deficitOrSurplus = getDeficitOrSurplus(149.5, profile); // 0.5 lbs away
    expect(deficitOrSurplus).toBeCloseTo(0.5 * CALORIES_PER_LB_PER_WEEK, 0);
  });

  it('gives exactly zero adjustment when already at target', () => {
    const profile = buildProfile(150, 1);
    const deficitOrSurplus = getDeficitOrSurplus(150, profile);
    expect(deficitOrSurplus).toBe(0);
  });

  it('never exceeds the configured max rate even when very far from target', () => {
    const profile = buildProfile(100, MAX_RATE_LBS_PER_WEEK); // ~2.2 lb/week cap
    const deficitOrSurplus = getDeficitOrSurplus(300, profile); // 200 lbs away
    const expectedDailyAdjustment = -MAX_RATE_LBS_PER_WEEK * CALORIES_PER_LB_PER_WEEK;
    // MAX_DEFICIT (1000) caps this further, so just assert it doesn't exceed either bound
    expect(deficitOrSurplus).toBeGreaterThanOrEqual(Math.max(expectedDailyAdjustment, -1000));
    expect(deficitOrSurplus).toBeLessThanOrEqual(0);
  });

  it('does not require the user to pick a direction — target above current infers gain', () => {
    const profile = buildProfile(160, 1);
    const deficitOrSurplus = getDeficitOrSurplus(150, profile);
    expect(deficitOrSurplus).toBeGreaterThan(0);
  });

  it('does not require the user to pick a direction — target below current infers loss', () => {
    const profile = buildProfile(140, 1);
    const deficitOrSurplus = getDeficitOrSurplus(150, profile);
    expect(deficitOrSurplus).toBeLessThan(0);
  });
});
