/**
 * Soil report adapter.
 *
 * Soil is HIGH RISK for misleading precision: a regional dataset must never be
 * presented as a field laboratory test. This adapter produces a deterministic
 * REGIONAL / MODELLED estimate and carries provenance + disclaimer in-band.
 * Priority order (documented): FIELD_MEASURED > FARMER_REPORTED > REGIONAL_MODELLED > UNKNOWN.
 *
 * No live soil provider is configured for this project, so we derive a coarse,
 * climate-zone-consistent texture estimate from latitude/longitude. The estimate
 * is deterministic (same coordinates → same report) and always labeled as
 * modelled — never "your field definitely has X soil".
 */

import { SoilReport } from '@/types';

/** Coarse India climate-zone banding by latitude band + longitude half. */
function zoneProfile(lat: number, lng: number): {
  zone: string;
  clay: number;
  sand: number;
  silt: number;
  ph: number;
  oc: 'Low' | 'Moderate' | 'High';
  cec: string;
} {
  // Deterministic, zone-banded pseudo-texture (documented as MODELLED):
  const wetZone = lat < 20 && lng > 74; // broad humid coastal/delta band
  if (wetZone) {
    return {
      zone: 'Humid tropical / deltaic (broad band)',
      clay: 42,
      sand: 31,
      silt: 27,
      ph: 6.7,
      oc: 'Moderate',
      cec: 'Moderate (est. 20–30 cmol/kg)',
    };
  }
  if (lat >= 25) {
    return {
      zone: 'Semi-arid alluvial (broad band)',
      clay: 22,
      sand: 48,
      silt: 30,
      ph: 7.6,
      oc: 'Low',
      cec: 'Low–Moderate (est. 12–20 cmol/kg)',
    };
  }
  return {
    zone: 'Transitional zone (broad band)',
    clay: 32,
    sand: 38,
    silt: 30,
    ph: 7.1,
    oc: 'Moderate',
    cec: 'Moderate (est. 15–25 cmol/kg)',
  };
}

export function getRegionalSoilReport(lat: number, lng: number): SoilReport {
  const p = zoneProfile(lat, lng);
  return {
    available: true,
    provenance: 'REGIONAL_MODELLED',
    properties: [
      { key: 'zone', label: 'Climate zone', value: p.zone },
      { key: 'ph', label: 'pH', value: String(p.ph) },
      { key: 'clay', label: 'Clay', value: String(p.clay), unit: '%' },
      { key: 'sand', label: 'Sand', value: String(p.sand), unit: '%' },
      { key: 'silt', label: 'Silt', value: String(p.silt), unit: '%' },
      { key: 'oc', label: 'Organic carbon', value: p.oc },
      { key: 'cec', label: 'CEC', value: p.cec },
    ],
    sourceLabel: 'Regional soil dataset (modelled estimate)',
    disclaimer:
      '⚠️ This is not a field laboratory test. Values are a regional/modelled estimate for orientation only — a soil test kit or lab report overrides this completely.',
    retrievedAt: new Date().toISOString(),
  };
}

/** Unknown state must be a first-class answer. */
export function getUnavailableSoilReport(reason: string): SoilReport {
  return {
    available: false,
    provenance: 'UNKNOWN',
    unavailableReason: reason,
    properties: [],
    sourceLabel: 'Unknown',
    disclaimer: 'No reliable soil data available for this location.',
    retrievedAt: new Date().toISOString(),
  };
}
