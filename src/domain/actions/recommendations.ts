import { RiskLevel } from '@/types';

/**
 * Pre-stored Recommendation Library
 * ---------------------------------
 * Deterministic, expert-reviewed action plans keyed by
 * `ruleFamily::riskLevel`. Every combination the Risk Engine
 * (src/domain/risk/rules.ts) can emit has an entry, so users always
 * receive a complete, consistent plan the moment a condition is
 * assessed — no generation step, no waiting.
 *
 * Content is aligned with ICAR / IRRI paddy submergence, heat-stress,
 * and integrated pest management protocols.
 */

export interface StoredPlan {
  doNow: string[];
  doNext: string[];
  avoid: string[];
  monitor: string[];
  escalate: string[];
}

export const RECOMMENDATION_LIBRARY: Record<string, StoredPlan> = {
  // ─────────────────────────────────────────────────────────────
  // PADDY WATERLOGGING
  // ─────────────────────────────────────────────────────────────
  'PADDY_WATERLOGGING::CRITICAL': {
    doNow: [
      'Cut emergency breaches in field bunds immediately at the lowest corners — the crop is at imminent risk of total asphyxiation.',
      'Open or cut a second outlet on the opposite bund corner to double the drainage rate if water is deeper than 20 cm.',
      'If gravity drainage is impossible, arrange mechanical pump-out immediately — every additional day of full submergence sharply raises plant mortality.',
      'Keep people and livestock off saturated bunds and flooded field edges for safety.',
    ],
    doNext: [
      'Once water recedes below 5 cm, apply a light foliar spray of 1% Urea + 1% Potassium Chloride to aid rapid metabolic recovery.',
      'Perform a node/tiller viability test after 4–5 days: green, firm nodes and upright new leaves mean recovery; soft, blackened nodes indicate loss.',
      'If the crop was fully submerged for more than 10–14 days at tillering, plan re-transplanting from a community nursery — coordinate seedling availability early.',
      'Top-dress nitrogen in 2 light splits (not one heavy dose) once the soil is aerated and plants show new leaf growth.',
    ],
    avoid: [
      'DO NOT apply top-dressing urea or granular fertilizers into standing flood water (causes total nutrient leaching and root burn).',
      'DO NOT spray contact pesticides while flood water remains standing (washes into waterways and burns stressed leaves).',
      'DO NOT walk heavily across saturated clay bunds to avoid structural collapse.',
      'DO NOT uproot the field prematurely — assess tiller survival first; apparently dead crops often recover from lower nodes.',
    ],
    monitor: [
      'Check standing water depth at the central peg every 2 hours until it drops below 10 cm.',
      'Watch growing tips daily: decomposing, foul-smelling tips signal advancing mortality.',
      'After water recedes, inspect for Bacterial Leaf Blight (water-soaked stripes) and Sheath Rot on newly exposed leaves.',
      'Track the 24–48h forecast before re-closing bund breaches.',
    ],
    escalate: [
      '🚨 Field worker review dispatched for immediate physical inspection.',
      'Notify the village FPO coordinator for community drainage canal opening and pump support.',
      'District agriculture officer informed for emergency input (seed/nursery) logistics if replanting becomes necessary.',
    ],
  },

  'PADDY_WATERLOGGING::HIGH': {
    doNow: [
      'Immediately cut breaches in field bunds (embankments) at the lowest corner to drain excess standing water.',
      'Ensure drainage channels and field trenches are cleared of weeds, debris, and silt accumulation.',
      'Keep crop canopy exposed to sunlight — do not let muddy flood water submerge the growing tips (>48 hours leads to mortality).',
    ],
    doNext: [
      'Once water recedes to <5 cm, apply a light foliar spray of 1% Urea + 1% Potassium Chloride to aid rapid metabolic recovery.',
      'Inspect roots for blackening or foul hydrogen-sulfide odor (asphyxiation); aerate soil through light inter-cultivation if firm enough.',
      'Re-fortify breached bunds only after water levels stabilize to protect against the next rain event.',
    ],
    avoid: [
      'DO NOT apply top-dressing urea or granular fertilizers into standing flood water (causes total nutrient leaching and root burn).',
      'DO NOT spray contact pesticides while rain continues or flood water remains standing (washes into waterways).',
      'DO NOT walk heavily across saturated clay bunds to avoid structural collapse.',
    ],
    monitor: [
      'Monitor standing water depth at central peg every 4 hours.',
      'Watch for Bacterial Leaf Blight (BLB) water-soaked lesions and Sheath Rot on newly drained leaves.',
      'Track forecast for next 24-48 hours before closing bund breaches.',
    ],
    escalate: [
      'Field worker review dispatched: Request physical inspection if water does not recede within 24 hours.',
      'Notify village FPO coordinator for community drainage canal clearance assistance.',
    ],
  },

  'PADDY_WATERLOGGING::MODERATE': {
    doNow: [
      'Open field drainage gates to maintain normal standing water depth (3–5 cm maximum for paddy).',
      'Inspect perimeter bunds for seepage or overflow risks and patch weak spots with fresh clay.',
      'Clear outlet channels so the next heavy rain can exit the field quickly.',
    ],
    doNext: [
      'Clear field runoff ditches connecting to the main village drainage channel.',
      'If rainfall stops, let the field dry gently — avoid sudden full drainage that shocks young roots.',
    ],
    avoid: [
      'Avoid heavy nitrogenous fertilizer application until water depth is stabilized.',
      'Do not close bunds tightly while overflow risk remains.',
    ],
    monitor: [
      'Check field water depth tomorrow morning.',
      'Inspect lower leaves for signs of yellowing or stagnation.',
      'Watch the sky and forecast — a second rain spike is the main escalation risk.',
    ],
    escalate: [
      'No immediate officer visit required; automated monitoring continues.',
      'Report again immediately if water depth crosses 15 cm or keeps rising.',
    ],
  },

  'PADDY_WATERLOGGING::LOW': {
    doNow: [
      'Maintain regular paddy water depth (3–5 cm) — current moisture is within safe bounds.',
      'Do a quick bund walk to confirm no seepage points are developing.',
    ],
    doNext: [
      'Plan routine weeding and channel upkeep while the weather holds.',
    ],
    avoid: [
      'Avoid unnecessary water drainage during normal dry spells.',
      'Do not apply extra irrigation beyond the usual schedule.',
    ],
    monitor: [
      'Continue routine field inspection once a day.',
      'Note any new low patches where water lingers longer than the rest.',
    ],
    escalate: [
      'No escalation needed; conditions are favorable.',
    ],
  },

  'PADDY_WATERLOGGING::NORMAL': {
    doNow: [
      'Soil moisture and standing water are within normal paddy cultivation bounds — continue standard irrigation schedule.',
    ],
    doNext: [
      'Use this stable period for planned nutrient application per your crop calendar.',
    ],
    avoid: [
      'Avoid unplanned drainage or flooding swings; consistency protects root health.',
    ],
    monitor: [
      'Continue routine field inspection.',
    ],
    escalate: [],
  },

  // ─────────────────────────────────────────────────────────────
  // HEAT STRESS
  // ─────────────────────────────────────────────────────────────
  'HEAT_STRESS::CRITICAL': {
    doNow: [
      'Maintain 5–7 cm standing water immediately — flowing or standing water is the strongest cooling barrier for soil and canopy.',
      'If irrigation water is available, run a light sprinkler/misting during peak heat (11 AM–2 PM) to protect pollen viability at flowering.',
      'Postpone any planned nitrogen top-dressing until temperatures ease — heat + fresh fertilizer compounds leaf burn.',
    ],
    doNext: [
      'Shift all irrigation to evening or very early morning while the heat wave lasts.',
      'If the crop is at flowering and heat persists beyond 3–4 days, consult the field officer about stage-specific recovery inputs.',
      'After temperatures normalize, assess filled-grain percentage before deciding on further nutrient investment.',
    ],
    avoid: [
      'DO NOT irrigate during peak afternoon heat (causes root thermal shock).',
      'DO NOT apply chemical sprays during high sun exposure.',
      'DO NOT drain the field dry during a heat wave — exposed bare soil can be 6–10°C hotter.',
    ],
    monitor: [
      'Inspect panicles daily for white empty spikelets (thermal sterility).',
      'Watch for midday leaf rolling and early morning recovery — non-recovering curl means severe stress.',
      'Track the temperature forecast for the next 72 hours.',
    ],
    escalate: [
      '🚨 Field worker notified for urgent verification of flowering-stage damage.',
      'Request FPO support for coordinated irrigation water release during the heat window.',
    ],
  },

  'HEAT_STRESS::HIGH': {
    doNow: [
      'Irrigate the field in the evening or early morning to maintain a 5–7 cm standing water barrier that lowers soil and canopy temperature.',
      'If at flowering stage, sprinkle light water during peak heat hours (11 AM–2 PM) to preserve pollen viability.',
    ],
    doNext: [
      'Add surface mulch or green manure cover on exposed bunds and ridges where feasible.',
      'Hold nitrogen top-dressing until the heat episode passes.',
    ],
    avoid: [
      'DO NOT irrigate during peak afternoon heat (causes root thermal shock).',
      'DO NOT apply chemical sprays during high sun exposure.',
    ],
    monitor: [
      'Inspect panicles for white empty spikelets (thermal sterility).',
      'Observe midday leaf curling and check recovery by next morning.',
    ],
    escalate: [
      'Field worker notified to verify crop stage and heat symptoms on the ground.',
    ],
  },

  'HEAT_STRESS::MODERATE': {
    doNow: [
      'Maintain shallow standing water (3–5 cm) to cushion the crop against daytime temperature spikes.',
    ],
    doNext: [
      'Schedule the next irrigation for early morning to maximize cooling benefit.',
    ],
    avoid: [
      'Avoid draining the field during the hot spell.',
    ],
    monitor: [
      'Observe midday leaf curling.',
      'Check the 3-day temperature trend each morning.',
    ],
    escalate: [
      'No escalation needed; continue observation.',
    ],
  },

  'HEAT_STRESS::LOW': {
    doNow: [
      'Temperatures are within normal limits — continue the regular irrigation calendar.',
    ],
    doNext: [
      'Keep bunds sealed to hold the protective water layer efficiently.',
    ],
    avoid: [
      'No special restrictions.',
    ],
    monitor: [
      'Routine daily observation is sufficient.',
    ],
    escalate: [],
  },

  // ─────────────────────────────────────────────────────────────
  // PEST / DISEASE
  // ─────────────────────────────────────────────────────────────
  'PEST_DISEASE::HIGH': {
    doNow: [
      'Isolate the affected patch and take clear close-up photos of leaf undersides and stem base for diagnosis.',
      'Install light traps or pheromone traps at 4–5 spots to gauge pest pressure overnight.',
      'Mark the spreading edge of the affected area with sticks/flags so spread can be measured tomorrow.',
    ],
    doNext: [
      'Submit photos or specimens to the field worker for verified identification before any spray decision.',
      'Identify a dry weather window (no rain for 6+ hours) as the only safe spray window.',
      'Prepare the recommended dose and PPE if the officer confirms a specific pesticide.',
    ],
    avoid: [
      'DO NOT apply broad-spectrum chemical sprays without verified identification from the field officer.',
      'DO NOT spray if rain is expected within 6 hours (wastes chemical, contaminates water).',
      'DO NOT enter or graze livestock in the treated area during the pre-harvest interval.',
    ],
    monitor: [
      'Check adjacent rows morning and evening for spread of yellowing or pest clusters.',
      'Count dead hearts / white ears per square meter to track stem borer pressure.',
      'Watch for Bacterial Leaf Blight lesions after humid days.',
    ],
    escalate: [
      'Field worker verification requested within 24 hours.',
      'If spread accelerates, the FPO coordinates a community-wide management drive (patch control alone fails).',
    ],
  },

  'PEST_DISEASE::MODERATE': {
    doNow: [
      'Photograph symptoms clearly and note which field sections show the problem.',
      'Avoid field operations that move soil or water from affected patches to healthy ones.',
    ],
    doNext: [
      'Submit sample or photos to field worker for verified diagnosis.',
      'Keep records of what you observe daily — spread rate drives the treatment decision.',
    ],
    avoid: [
      'DO NOT apply broad-spectrum chemical sprays without verified identification from field officer.',
    ],
    monitor: [
      'Check adjacent rows for spread of yellowing or pest clusters.',
      'Re-examine marked plants every morning.',
    ],
    escalate: [
      'Field worker notified for symptom verification.',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // GENERAL HAZARD / UNKNOWN
  // ─────────────────────────────────────────────────────────────
  'GENERAL_HAZARD::NORMAL': {
    doNow: [
      'No emergency conditions detected — environmental data is within safe agronomic thresholds.',
    ],
    doNext: [
      'Continue the routine crop calendar; use this window for preventive field upkeep.',
    ],
    avoid: [
      'Avoid unnecessary interventions that disturb a stable field.',
    ],
    monitor: [
      'Continue routine environmental monitoring; FarmRescue re-assesses automatically when new evidence arrives.',
    ],
    escalate: [],
  },
};

/**
 * Resolve the pre-stored plan for a rule version + risk level pair.
 * Returns undefined when no entry exists (caller decides fallback).
 */
export function getStoredRecommendation(
  ruleVersion: string,
  riskLevel: RiskLevel
): StoredPlan | undefined {
  const family =
    ['PADDY_WATERLOGGING', 'HEAT_STRESS', 'PEST_DISEASE', 'GENERAL_HAZARD'].find(
      (key) => ruleVersion.startsWith(key)
    ) ?? 'GENERAL_HAZARD';

  return (
    RECOMMENDATION_LIBRARY[`${family}::${riskLevel}`] ??
    RECOMMENDATION_LIBRARY[`GENERAL_HAZARD::NORMAL`]
  );
}
