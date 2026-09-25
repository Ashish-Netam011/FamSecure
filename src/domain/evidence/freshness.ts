import { EvidenceItem, EvidenceStrength } from '@/types';

export type FreshnessState = 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';

export function getFreshnessState(freshnessMinutes: number): FreshnessState {
  if (freshnessMinutes <= 30) return 'FRESH';
  if (freshnessMinutes <= 180) return 'AGING';
  if (freshnessMinutes <= 1440) return 'STALE';
  return 'UNAVAILABLE';
}

export function evaluateEvidenceStrength(
  items: EvidenceItem[]
): EvidenceStrength {
  if (!items || items.length === 0) {
    return 'WEAK';
  }

  // Check for conflicting evidence
  const rainfallItem = items.find((i) => i.type === 'rainfall_24h');
  const standingWater = items.find((i) => i.type === 'standing_water_duration');

  if (rainfallItem && rainfallItem.value === 0 && standingWater && Number(standingWater.value) > 48) {
    // Zero rain but heavy standing water might indicate drainage canal breach or irrigation issue
    // Keep high vigilance
  }

  // Count strong verified/reliable sources
  const strongSources = items.filter(
    (i) =>
      (i.source === 'weather_provider' || i.source === 'field_worker' || i.source === 'simulation') &&
      i.freshnessMinutes < 120
  );

  const farmerObs = items.filter((i) => i.source === 'farmer_observation');

  if (strongSources.length >= 2 && farmerObs.length >= 1) {
    return 'STRONG';
  }

  if (strongSources.length >= 1 || farmerObs.length >= 2) {
    return 'MODERATE';
  }

  return 'WEAK';
}
