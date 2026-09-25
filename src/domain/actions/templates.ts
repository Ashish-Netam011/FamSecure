import { Farm, RiskAssessment, ActionPlan } from '@/types';

export function generateActionPlan(
  assessment: RiskAssessment,
  farm: Farm,
  incidentId: string
): ActionPlan {
  const doNow: string[] = [];
  const doNext: string[] = [];
  const avoid: string[] = [];
  const monitor: string[] = [];
  const escalate: string[] = [];

  const { riskLevel, ruleVersion } = assessment;

  // Primary: Waterlogging on Paddy
  if (ruleVersion.startsWith('PADDY_WATERLOGGING')) {
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      doNow.push('Immediately cut breaches in field bunds (embankments) at the lowest corner to drain excess standing water.');
      doNow.push('Ensure drainage channels and field trenches are cleared of weeds, debris, and silt accumulation.');
      doNow.push('Keep crop canopy exposed to sunlight—do not let muddy flood water submerge the growing tips (>48 hours leads to mortality).');

      doNext.push('Once water recedes to <5 cm, apply a light foliar spray of 1% Urea + 1% Potassium Chloride to aid rapid metabolic recovery.');
      doNext.push('Inspect roots for blackening or foul hydrogen-sulfide odor (asphyxiation); aerate soil through light inter-cultivation if firm enough.');

      avoid.push('DO NOT apply top-dressing urea or granular fertilizers into standing flood water (causes total nutrient leaching and root burn).');
      avoid.push('DO NOT spray contact pesticides while rain continues or flood water remains standing (washes into waterways).');
      avoid.push('DO NOT walk heavily across saturated clay bunds to avoid structural collapse.');

      monitor.push('Monitor standing water depth at central peg every 4 hours.');
      monitor.push('Watch for Bacterial Leaf Blight (BLB) water-soaked lesions and Sheath Rot on newly drained leaves.');
      monitor.push('Track forecast for next 24-48 hours before closing bund breaches.');

      escalate.push('Field worker review dispatched: Request physical inspection if water does not recede within 24 hours.');
      escalate.push('Notify village FPO coordinator for community drainage canal clearance assistance.');
    } else if (riskLevel === 'MODERATE') {
      doNow.push('Open field drainage gates to maintain normal standing water depth (3–5 cm maximum for paddy).');
      doNow.push('Inspect perimeter bunds for seepage or overflow risks.');

      doNext.push('Clear field runoff ditches connecting to the main village drainage channel.');
      avoid.push('Avoid heavy nitrogenous fertilizer application until water depth is stabilized.');
      monitor.push('Check field water depth tomorrow morning.');
      monitor.push('Inspect lower leaves for signs of yellowing or stagnation.');
    } else {
      doNow.push('Maintain regular paddy water depth (3–5 cm).');
      monitor.push('Continue routine field inspection.');
      avoid.push('Avoid unnecessary water drainage during normal dry spells.');
    }
  }
  // Secondary: Heat Stress
  else if (ruleVersion.startsWith('HEAT_STRESS')) {
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      doNow.push('Irrigate field in the evening or early morning to maintain 5–7 cm standing water barrier to lower soil and canopy temperature.');
      doNow.push('If at flowering stage, sprinkle light water during peak heat hours (11 AM - 2 PM) to preserve pollen viability.');
      avoid.push('DO NOT irrigate during peak afternoon heat (causes root thermal shock).');
      avoid.push('DO NOT apply chemical sprays during high sun exposure.');
      monitor.push('Inspect panicles for white empty spikelets (thermal sterility).');
    } else {
      doNow.push('Maintain shallow irrigation layer to cushion against diurnal temperature spikes.');
      monitor.push('Observe midday leaf curling.');
    }
  }
  // Secondary: Pest / Disease
  else {
    doNow.push('Isolate affected crop patch and take clear close-up photos of leaf undersides and stem base.');
    avoid.push('DO NOT apply broad-spectrum chemical sprays without verified identification from field officer.');
    doNext.push('Submit sample or photos to field worker for verified diagnosis.');
    monitor.push('Check adjacent rows for spread of yellowing or pest clusters.');
    escalate.push('Field worker notified for symptom verification.');
  }

  const why = assessment.rationale;
  const version = `AP-${Date.now()}`;

  return {
    id: `act-${Date.now()}`,
    incidentId,
    assessmentId: assessment.id,
    doNow,
    doNext,
    avoid,
    monitor,
    escalate,
    why,
    reviewAt: assessment.reviewAt,
    version,
    createdAt: new Date().toISOString(),
  };
}
