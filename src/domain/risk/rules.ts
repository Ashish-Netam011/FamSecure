import {
  Farm,
  EvidenceItem,
  RiskAssessment,
  RiskLevel,
  EvidenceStrength,
} from '@/types';
import { evaluateEvidenceStrength } from '../evidence/freshness';

export interface RuleEvaluationInput {
  farm: Farm;
  evidence: EvidenceItem[];
  incidentType: string;
}

export const RULE_VERSIONS = {
  PADDY_WATERLOGGING: 'PADDY_WATERLOGGING_001-v1.2',
  HEAT_STRESS: 'HEAT_STRESS_001-v1.0',
  PEST_DISEASE: 'PEST_DISEASE_001-v1.0',
  GENERAL_HAZARD: 'GENERAL_HAZARD_001-v1.0',
};

export function evaluateRisk(input: RuleEvaluationInput): RiskAssessment {
  const { farm, evidence, incidentType } = input;
  const assessedAt = new Date().toISOString();
  const evidenceStrength: EvidenceStrength = evaluateEvidenceStrength(evidence);

  // Extract key evidence metrics
  const rainfall24h = Number(
    evidence.find((e) => e.type === 'rainfall_24h')?.value ?? 0
  );
  const forecastRainfall = Number(
    evidence.find((e) => e.type === 'rainfall_forecast')?.value ?? 0
  );
  const standingWaterHours = Number(
    evidence.find((e) => e.type === 'standing_water_duration')?.value ?? 0
  );
  const standingWaterDepthCm = Number(
    evidence.find((e) => e.type === 'standing_water_depth')?.value ?? 0
  );
  const temperature = Number(
    evidence.find((e) => e.type === 'temperature')?.value ?? 28
  );

  const contributingEvidence: string[] = [];
  const missingEvidence: string[] = [];

  // Track present evidence
  if (rainfall24h > 0) contributingEvidence.push(`24h Rainfall: ${rainfall24h} mm`);
  else missingEvidence.push('Recent 24h rainfall data');

  if (standingWaterHours > 0) contributingEvidence.push(`Standing water duration: ~${standingWaterHours} hours`);
  if (standingWaterDepthCm > 0) contributingEvidence.push(`Water depth: ~${standingWaterDepthCm} cm`);
  if (forecastRainfall > 0) contributingEvidence.push(`Forecast rainfall: ${forecastRainfall} mm expected`);

  // Default evaluation
  let riskLevel: RiskLevel = 'NORMAL';
  let ruleVersion = RULE_VERSIONS.GENERAL_HAZARD;
  let escalationRequired = false;
  let rationale = 'Routine environmental conditions within acceptable agronomic thresholds.';

  // 1. Waterlogging Rule for Paddy
  if (
    farm.crop === 'paddy' &&
    (incidentType === 'waterlogging' || incidentType === 'heavy_rain' || rainfall24h >= 40 || standingWaterHours >= 12)
  ) {
    ruleVersion = RULE_VERSIONS.PADDY_WATERLOGGING;

    // Agronomic risk logic
    const isPoorDrainage = farm.drainage === 'poor';
    const isSensitiveStage = ['tillering', 'panicle_initiation', 'flowering'].includes(farm.cropStage);
    const heavyRain = rainfall24h >= 60 || (rainfall24h >= 45 && forecastRainfall >= 30);
    const prolongedSubmergence = standingWaterHours >= 24 || standingWaterDepthCm >= 15;

    const extremeFlood = (rainfall24h >= 100 || (rainfall24h >= 75 && standingWaterHours >= 36)) && isPoorDrainage;

    if (extremeFlood) {
      riskLevel = 'CRITICAL';
      escalationRequired = true;
      rationale = `Critical waterlogging detected: Extreme rainfall (${rainfall24h}mm), severe submergence (${standingWaterHours}h), and poor soil drainage pose imminent risk of total crop asphyxiation and mortality at ${farm.cropStage} stage.`;
    } else if (heavyRain || prolongedSubmergence || (rainfall24h >= 50 && isSensitiveStage)) {
      riskLevel = 'HIGH';
      escalationRequired = true;
      rationale = `High waterlogging risk: Cumulative rainfall (${rainfall24h}mm) and standing water (~${standingWaterHours}h) exceed safe vegetative thresholds. Active drainage intervention required.`;
    } else if (rainfall24h >= 30 || standingWaterHours >= 8) {
      riskLevel = 'MODERATE';
      escalationRequired = false;
      rationale = `Moderate waterlogging alert: Elevated rainfall (${rainfall24h}mm) with standing water observed. Drain outlets must be kept open to prevent prolonged submergence.`;
    } else if (rainfall24h >= 15 || standingWaterHours > 0) {
      riskLevel = 'LOW';
      rationale = `Low water accumulation observed. Paddy crop can tolerate current moisture levels without immediate emergency action.`;
    } else {
      riskLevel = 'NORMAL';
      rationale = 'Soil moisture and standing water within normal paddy cultivation bounds.';
    }
  }
  // 2. Heat Stress Rule
  else if (incidentType === 'heat_stress' || temperature >= 36) {
    ruleVersion = RULE_VERSIONS.HEAT_STRESS;
    if (temperature >= 40 && ['flowering', 'panicle_initiation'].includes(farm.cropStage)) {
      riskLevel = 'CRITICAL';
      escalationRequired = true;
      rationale = `Critical thermal stress: Ambient temperature of ${temperature}°C during ${farm.cropStage} causes spikelet sterility and irreversible grain abortion.`;
    } else if (temperature >= 38) {
      riskLevel = 'HIGH';
      escalationRequired = true;
      rationale = `High thermal stress: Severe daytime heat (${temperature}°C) triggering high evapotranspiration and leaf wilting.`;
    } else if (temperature >= 35) {
      riskLevel = 'MODERATE';
      rationale = `Moderate heat stress: Temperature at ${temperature}°C. Maintain shallow standing water barrier to regulate microclimate.`;
    } else {
      riskLevel = 'LOW';
      rationale = 'Temperature within normal diurnal limits.';
    }
  }
  // 3. Pest / Disease Rule
  else if (incidentType === 'pest' || incidentType === 'disease') {
    ruleVersion = RULE_VERSIONS.PEST_DISEASE;
    const hasLeafSymptom = evidence.some((e) => e.type === 'leaf_yellowing' || e.type === 'pest_sighting');
    if (hasLeafSymptom && (rainfall24h > 30 || temperature > 30)) {
      riskLevel = 'HIGH';
      escalationRequired = true;
      rationale = 'High pest/disease vulnerability: Post-moisture humidity combined with observed leaf symptoms requires urgent field verification before spraying.';
    } else {
      riskLevel = 'MODERATE';
      escalationRequired = false;
      rationale = 'Pest/disease symptoms reported. Ground verification needed before chemical application.';
    }
  }

  // Calculate reviewAt (time-bounded validity: 4 hours for high/critical, 12 hours for moderate)
  const validityHours = riskLevel === 'CRITICAL' ? 3 : riskLevel === 'HIGH' ? 6 : 12;
  const reviewAt = new Date(Date.now() + validityHours * 3600 * 1000).toISOString();

  return {
    id: `ra-${Date.now()}`,
    incidentId: '',
    ruleVersion,
    riskLevel,
    evidenceStrength,
    contributingEvidence,
    missingEvidence,
    assessedAt,
    reviewAt,
    escalationRequired,
    rationale,
  };
}
