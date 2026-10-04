import { Farm, RiskAssessment, ActionPlan } from '@/types';
import { getStoredRecommendation } from './recommendations';

/**
 * Build the ActionPlan from the pre-stored recommendation library.
 *
 * Every rule-family × risk-level combination the Risk Engine can emit
 * has a reviewed, deterministic entry, so recommendations are instant
 * and consistent across reassessments. The Safety Gate still validates
 * the resulting plan downstream.
 */
export function generateActionPlan(
  assessment: RiskAssessment,
  farm: Farm,
  incidentId: string
): ActionPlan {
  const stored =
    getStoredRecommendation(assessment.ruleVersion, assessment.riskLevel) ?? {
      doNow: ['Continue standard field management; no emergency actions required.'],
      doNext: [],
      avoid: [],
      monitor: ['Continue routine field observation.'],
      escalate: [],
    };

  return {
    id: `act-${Date.now()}`,
    incidentId,
    assessmentId: assessment.id,
    doNow: [...stored.doNow],
    doNext: [...stored.doNext],
    avoid: [...stored.avoid],
    monitor: [...stored.monitor],
    escalate: [...stored.escalate],
    why: assessment.rationale,
    reviewAt: assessment.reviewAt,
    version: `AP-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}
