import {
  Farm,
  RiskAssessment,
  ActionPlan,
  EvidenceItem,
  ExplanationResponse,
} from '@/types';

export interface AIExplanationInput {
  farm: Farm;
  assessment: RiskAssessment;
  actionPlan: ActionPlan;
  evidence: EvidenceItem[];
  language?: string;
}

export async function explainRiskAndActions(
  input: AIExplanationInput
): Promise<ExplanationResponse> {
  const { farm, assessment, actionPlan, evidence } = input;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `
You are the AI Explanation Layer for FarmRescue, an evidence-first agricultural emergency system.
YOUR STRICT BOUNDARY:
- Do NOT alter or question the Risk Assessment (${assessment.riskLevel}).
- Do NOT invent weather facts or recommend chemical pesticides.
- Explain the validated agricultural facts in clear, calm, practical terms suitable for an Indian smallholder farmer.

CONTEXT:
Crop: ${farm.crop} (${farm.cropVariety || 'Standard variety'}), Stage: ${farm.cropStage}
Field Soil: ${farm.soilType}, Drainage: ${farm.drainage}
Deterministic Risk Assessment: ${assessment.riskLevel} (Rule: ${assessment.ruleVersion})
Rationale: ${assessment.rationale}

VALIDATED EVIDENCE:
${evidence.map((e) => `- ${e.type}: ${e.value} ${e.unit || ''} (Strength: ${e.strength})`).join('\n')}

APPROVED ACTIONS:
DO NOW: ${actionPlan.doNow.join('; ')}
AVOID: ${actionPlan.avoid.join('; ')}
MONITOR: ${actionPlan.monitor.join('; ')}

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "Short 2-sentence farmer-friendly summary of the situation.",
  "why": ["Point 1 explaining why risk was assigned based on evidence", "Point 2"],
  "doNowExplanation": ["Why step 1 is critical right now", "Why step 2 matters"],
  "avoidExplanation": ["Why avoid step 1 protects the farm"],
  "watchFor": ["Specific symptom 1 to look for tomorrow", "Specific symptom 2"],
  "escalationNotice": "Statement on whether an agricultural officer or field worker has been alerted."
}
`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary || 'Situation assessed based on field evidence.',
            why: parsed.why || [assessment.rationale],
            doNowExplanation: parsed.doNowExplanation || actionPlan.doNow,
            avoidExplanation: parsed.avoidExplanation || actionPlan.avoid,
            watchFor: parsed.watchFor || actionPlan.monitor,
            escalationNotice: parsed.escalationNotice || (assessment.escalationRequired ? 'Field worker notified.' : 'Self-monitoring recommended.'),
            source: 'ai_adapter_gemini',
          };
        }
      }
    } catch {
      // Degrade gracefully to deterministic fallback
    }
  }

  // Robust, zero-failure deterministic fallback
  return getDeterministicExplanation(farm, assessment, actionPlan, evidence);
}

function getDeterministicExplanation(
  farm: Farm,
  assessment: RiskAssessment,
  actionPlan: ActionPlan,
  evidence: EvidenceItem[]
): ExplanationResponse {
  const rainfall = evidence.find((e) => e.type === 'rainfall_24h')?.value ?? 0;
  const duration = evidence.find((e) => e.type === 'standing_water_duration')?.value ?? 0;

  const isHighOrCritical = assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL';

  const summary = isHighOrCritical
    ? `Your ${farm.crop} field is facing serious water accumulation (${rainfall}mm rainfall, ~${duration}h standing water). Immediate drainage intervention is required to prevent root asphyxiation during the ${farm.cropStage} stage.`
    : `Conditions on your ${farm.crop} farm are currently ${assessment.riskLevel.toLowerCase()}. Regular drainage maintenance will ensure the crop continues to grow safely.`;

  const why = [
    `Recorded rainfall of ${rainfall} mm within 24 hours has saturated ${farm.soilType} soil.`,
    `Water has been standing for approximately ${duration} hours in ${farm.drainage} drainage conditions.`,
    `During ${farm.cropStage}, prolonged submersion limits root respiration and nutrient uptake.`,
  ];

  const doNowExplanation = actionPlan.doNow.map((action) => `Action: ${action}`);
  const avoidExplanation = actionPlan.avoid.map((avoidItem) => `Caution: ${avoidItem}`);
  const watchFor = actionPlan.monitor;
  const escalationNotice = assessment.escalationRequired
    ? '🚨 A local Field Worker has been alerted in the review queue to assist with verification and community drainage.'
    : 'Automated monitoring active. Reassessment will trigger automatically if rainfall or water level changes.';

  return {
    summary,
    why,
    doNowExplanation,
    avoidExplanation,
    watchFor,
    escalationNotice,
    source: 'deterministic_fallback',
  };
}
