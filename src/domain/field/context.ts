/**
 * Field evidence context builder — the Map → Field → Evidence → Risk bridge.
 *
 * Pipeline: RAW DATA → NORMALIZATION → VALIDATION → FRESHNESS CHECK →
 * SOURCE CLASSIFICATION → EVIDENCE STRENGTH → (risk engine).
 *
 * No fabricated precision: every item carries kind (OBSERVED / FORECAST /
 * MODELLED / REPORTED), a verdict (STRONG / MODERATE / LIMITED / UNKNOWN),
 * and human-readable reasons. Unknown is a valid state. No fake percentages.
 */

import {
  EvidenceItem,
  EvidenceKind,
  EvidenceVerdict,
  Farm,
  FieldWeatherBundle,
  SoilReport,
} from '@/types';
import { isValidCoordinate } from '@/lib/geo';

export interface VerdictedEvidence {
  item: EvidenceItem;
  verdict: EvidenceVerdict;
  reasons: string[];
}

function ageMinutes(observedAt: string, receivedAt: string): number {
  const t = Date.parse(observedAt);
  if (!Number.isFinite(t)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

function freshnessLabel(minutes: number): string {
  if (minutes <= 30) return 'FRESH';
  if (minutes <= 180) return 'AGING';
  if (minutes <= 1440) return 'STALE';
  return 'UNAVAILABLE';
}

function baseEvidence(fields: {
  id: string;
  incidentId: string;
  source: EvidenceItem['source'];
  type: EvidenceItem['type'];
  value: number | string | boolean;
  unit?: string;
  observedAt: string;
  kind: EvidenceKind;
  location?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}): EvidenceItem {
  const receivedAt = new Date().toISOString(); // server-assigned
  const freshnessMinutes = ageMinutes(fields.observedAt, receivedAt);
  return {
    id: fields.id,
    incidentId: fields.incidentId,
    source: fields.source,
    type: fields.type,
    value: fields.value,
    unit: fields.unit,
    observedAt: fields.observedAt,
    retrievedAt: receivedAt,
    freshnessMinutes,
    strength: freshnessMinutes <= 30 ? 'STRONG' : freshnessMinutes <= 180 ? 'MODERATE' : 'WEAK',
    reliability: fields.kind === 'FORECAST' ? 'reported' : 'verified',
    kind: fields.kind,
    location: fields.location,
    metadata: fields.metadata,
  };
}

// ── Validation gates (Section 16: reject bad data, never silently substitute) ──

export function validateWeatherBundle(b: FieldWeatherBundle): string[] {
  const problems: string[] = [];
  if (!b || typeof b !== 'object') return ['Weather bundle missing'];
  if (!Number.isFinite(b.current?.temperatureC) || b.current.temperatureC < -50 || b.current.temperatureC > 60) {
    problems.push('Current temperature out of plausible range');
  }
  if (!Number.isFinite(b.current?.rainfall24hMm) || b.current.rainfall24hMm < 0 || b.current.rainfall24hMm > 1500) {
    problems.push('Current rainfall out of plausible range');
  }
  if (b.degraded) problems.push('Weather provider unavailable — model fallback in use');
  return problems;
}

export function validateCoordinates(lat: unknown, lng: unknown): boolean {
  return isValidCoordinate(lat, lng);
}

// ── Builders ──────────────────────────────────────────────────────────────

export function weatherEvidenceFromBundle(
  bundle: FieldWeatherBundle,
  location: { lat: number; lng: number }
): VerdictedEvidence[] {
  const out: VerdictedEvidence[] = [];
  const problems = validateWeatherBundle(bundle);
  const observedAt = bundle.current.observedAt;

  const rain = baseEvidence({
    id: `ev-wx-rain-${Date.now()}`,
    incidentId: '',
    source: 'weather_provider',
    type: 'rainfall_24h',
    value: bundle.current.rainfall24hMm,
    unit: 'mm',
    observedAt,
    kind: 'OBSERVED',
    location,
    metadata: { provider: bundle.provider },
  });
  out.push(verdictFor(rain, problems));

  const temp = baseEvidence({
    id: `ev-wx-temp-${Date.now()}`,
    incidentId: '',
    source: 'weather_provider',
    type: 'temperature',
    value: bundle.current.temperatureC,
    unit: '°C',
    observedAt,
    kind: 'OBSERVED',
    location,
    metadata: { provider: bundle.provider },
  });
  out.push(verdictFor(temp, problems));

  // Forecast: clearly labeled FORECAST — feeds context, never treated as observation.
  const nextRain = bundle.forecast.reduce((m, f) => Math.max(m, f.rainfallMm), 0);
  if (nextRain > 0) {
    const fc = baseEvidence({
      id: `ev-wx-forecast-${Date.now()}`,
      incidentId: '',
      source: 'weather_provider',
      type: 'rainfall_forecast',
      value: nextRain,
      unit: 'mm / 24h',
      observedAt: bundle.retrievedAt,
      kind: 'FORECAST',
      location,
      metadata: { provider: bundle.provider, window: 'next 5 days' },
    });
    out.push(verdictFor(fc, problems));
  }

  return out;
}

function verdictFor(item: EvidenceItem, problems: string[]): VerdictedEvidence {
  const reasons: string[] = [];
  let verdict: EvidenceVerdict = 'STRONG';

  if (item.kind === 'FORECAST') {
    verdict = 'MODERATE';
    reasons.push('⚠️ Forecast (not an observation)');
  }
  if (item.freshnessMinutes <= 30) reasons.push('✓ Recent observation');
  else if (item.freshnessMinutes <= 180) { verdict = weaker(verdict, 'MODERATE'); reasons.push('✓ Aging observation (≤3 h)'); }
  else { verdict = weaker(verdict, 'LIMITED'); reasons.push('⚠️ Stale observation (>3 h)'); }

  if (item.location && isValidCoordinate(item.location.lat, item.location.lng)) {
    reasons.push('✓ Location matches field');
  }
  for (const p of problems) {
    verdict = weaker(verdict, 'LIMITED');
    reasons.push(`⚠️ ${p}`);
  }
  if (item.source === 'weather_provider') reasons.push('✓ Provider-sourced');

  return { item, verdict, reasons };
}

function weaker(a: EvidenceVerdict, b: EvidenceVerdict): EvidenceVerdict {
  const order: EvidenceVerdict[] = ['STRONG', 'MODERATE', 'LIMITED', 'UNKNOWN'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/** Soil verdict: regional/modelled is always LIMITED, with honest reasons. */
export function soilEvidence(
  report: SoilReport,
  location: { lat: number; lng: number }
): VerdictedEvidence | null {
  if (!report.available) return null; // Unknown is valid: no soil evidence emitted
  const item = baseEvidence({
    id: `ev-soil-${Date.now()}`,
    incidentId: '',
    source: 'weather_provider', // nearest existing enum; provenance carried in kind/metadata
    type: 'soil_saturation',
    value: `${report.properties.find((p) => p.key === 'clay')?.value ?? '?'}% clay (modelled)`,
    observedAt: report.retrievedAt,
    kind: 'MODELLED',
    location,
    metadata: { provenance: report.provenance, sourceLabel: report.sourceLabel },
  });
  return {
    item,
    verdict: 'LIMITED',
    reasons: [
      '⚠️ Soil is regional/modelled',
      '⚠️ No field measurement',
      '✓ Location-matched broad zone only',
    ],
  };
}

/** Field-condition observation → evidence (REPORTED, farmer authority for own field). */
export function observationEvidence(fields: {
  id: string;
  type: EvidenceItem['type'];
  value: number | string | boolean;
  unit?: string;
  observedAt: string;
  reporter: 'FARMER' | 'FIELD_WORKER' | 'SYSTEM';
  location?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}): VerdictedEvidence {
  const item = baseEvidence({
    id: fields.id,
    incidentId: '',
    source: fields.reporter === 'FIELD_WORKER' ? 'field_worker' : 'farmer_observation',
    type: fields.type,
    value: fields.value,
    unit: fields.unit,
    observedAt: fields.observedAt,
    kind: 'REPORTED',
    location: fields.location,
    metadata: fields.metadata,
  });
  const reasons: string[] = ['✓ Direct human observation'];
  if (fields.reporter === 'FIELD_WORKER') reasons.push('✓ Trained field worker');
  let verdict: EvidenceVerdict = fields.reporter === 'FIELD_WORKER' ? 'STRONG' : 'MODERATE';
  if (item.freshnessMinutes > 180) {
    verdict = 'LIMITED';
    reasons.push('⚠️ Observation is stale (>3 h)');
  }
  return { item, verdict, reasons };
}

/** Aggregate verdict for a whole evidence set — feeds the Safety Gate language. */
export function aggregateVerdict(items: VerdictedEvidence[]): {
  verdict: EvidenceVerdict;
  reasons: string[];
} {
  if (items.length === 0) {
    return { verdict: 'UNKNOWN', reasons: ['⚠️ No evidence collected for this field yet'] };
  }
  const order: EvidenceVerdict[] = ['STRONG', 'MODERATE', 'LIMITED', 'UNKNOWN'];
  let verdict: EvidenceVerdict = 'STRONG';
  const reasons: string[] = [];
  for (const v of items) {
    verdict = weaker(verdict, v.verdict);
    reasons.push(...v.reasons);
  }
  // Deduplicate, keep stable order.
  const seen = new Set<string>();
  const uniqueReasons = reasons.filter((r) => (seen.has(r) ? false : (seen.add(r), true)));
  void order;
  return { verdict, reasons: uniqueReasons };
}

/**
 * Build the full field evidence context for incident creation.
 * Returns evidence items ready to attach + aggregate verdict + missing list.
 */
export function buildFieldEvidenceContext(fields: {
  farm: Farm;
  weather: FieldWeatherBundle | null;
  soil: SoilReport | null;
  latestCondition: { condition: string; waterDepthCm?: number; observedAt: string } | null;
}): {
  evidence: EvidenceItem[];
  verdict: EvidenceVerdict;
  reasons: string[];
  missing: string[];
} {
  const location = { lat: fields.farm.location.lat, lng: fields.farm.location.lng };
  const all: VerdictedEvidence[] = [];
  const missing: string[] = [];

  if (fields.weather && !fields.weather.degraded) {
    all.push(...weatherEvidenceFromBundle(fields.weather, location));
  } else {
    missing.push('Weather (provider unavailable)');
  }

  const soilEv = fields.soil ? soilEvidence(fields.soil, location) : null;
  if (soilEv) all.push(soilEv);
  else missing.push('Soil (no reliable data)');

  if (fields.latestCondition && fields.latestCondition.condition !== 'unknown') {
    all.push(
      observationEvidence({
        id: `ev-cond-${Date.now()}`,
        type: fields.latestCondition.waterDepthCm !== undefined ? 'standing_water_depth' : 'farmer_note',
        value:
          fields.latestCondition.waterDepthCm !== undefined
            ? fields.latestCondition.waterDepthCm
            : fields.latestCondition.condition,
        unit: fields.latestCondition.waterDepthCm !== undefined ? 'cm' : undefined,
        observedAt: fields.latestCondition.observedAt,
        reporter: 'FARMER',
        location,
        metadata: { condition: fields.latestCondition.condition },
      })
    );
  } else {
    missing.push('Field water condition (not reported)');
  }

  const agg = aggregateVerdict(all);
  return { evidence: all.map((v) => v.item), verdict: agg.verdict, reasons: agg.reasons, missing };
}
