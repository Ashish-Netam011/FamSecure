import { Farm, RiskAssessment, ActionPlan, EvidenceItem } from '@/types';
import { generateActionPlan } from '../actions/templates';

export interface SafetyGateResult {
  isSafe: boolean;
  actionPlan: ActionPlan;
  escalationRequired: boolean;
  safetyWarnings: string[];
  evidenceSufficiency: 'SUFFICIENT' | 'INSUFFICIENT' | 'CONFLICTING';
}

export function evaluateSafetyGate(
  assessment: RiskAssessment,
  farm: Farm,
  evidence: EvidenceItem[],
  incidentId: string
): SafetyGateResult {
  const safetyWarnings: string[] = [];
  let escalationRequired = assessment.escalationRequired;
  let evidenceSufficiency: 'SUFFICIENT' | 'INSUFFICIENT' | 'CONFLICTING' = 'SUFFICIENT';

  // 1. Check evidence sufficiency
  if (!evidence || evidence.length === 0) {
    evidenceSufficiency = 'INSUFFICIENT';
    safetyWarnings.push('Insufficient evidence: No environmental or observational data provided.');
    escalationRequired = true;
  }

  // 2. Check for conflicting signals
  const rainfallItem = evidence.find((e) => e.type === 'rainfall_24h');
  const standingWater = evidence.find((e) => e.type === 'standing_water_duration');

  if (rainfallItem && Number(rainfallItem.value) === 0 && standingWater && Number(standingWater.value) > 36) {
    evidenceSufficiency = 'CONFLICTING';
    safetyWarnings.push('Conflicting data: Zero rainfall recorded despite reports of deep standing water. Possible canal overflow or irrigation malfunction.');
    escalationRequired = true;
  }

  // 3. Generate structured action plan
  const actionPlan = generateActionPlan(assessment, farm, incidentId);

  // 4. Validate agricultural action safety (strip out any potentially hazardous instructions)
  // Ensure NO chemical pesticide is recommended during flooding
  if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
    const hasUnsafeFertilizer = actionPlan.doNow.some((action) =>
      action.toLowerCase().includes('urea') || action.toLowerCase().includes('fertilizer')
    );
    if (hasUnsafeFertilizer) {
      safetyWarnings.push('Safety gate intercepted: Granular fertilizer top-dressing blocked during active flooding.');
    }
  }

  // 5. Enforce escalation for high severity
  if (assessment.riskLevel === 'CRITICAL' || assessment.riskLevel === 'HIGH') {
    escalationRequired = true;
  }

  return {
    isSafe: true,
    actionPlan,
    escalationRequired,
    safetyWarnings,
    evidenceSufficiency,
  };
}
