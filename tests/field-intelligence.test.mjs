/**
 * Field Intelligence unit tests — Node built-in test runner (node --test).
 * Zero dependencies. Sources are compiled to JS first:
 *   npx tsc -p tsconfig.test.json   (outputs to .tmp-testbuild)
 *   node --test tests/
 *
 * Covered: coordinate validation, polygon math, weather observed-vs-forecast
 * labeling, soil provenance/unknown, evidence verdicts, validation contracts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCoordinate,
  parseCoordinate,
  polygonAreaSqM,
  polygonCentroid,
  isValidPolygon,
  distanceMeters,
} from '../.tmp-testbuild/lib/geo/index.js';

import {
  weatherEvidenceFromBundle,
  soilEvidence,
  aggregateVerdict,
  validateWeatherBundle,
} from '../.tmp-testbuild/domain/field/context.js';
import {
  getRegionalSoilReport,
  getUnavailableSoilReport,
} from '../.tmp-testbuild/domain/soil/adapter.js';

const now = () => new Date().toISOString();

function makeBundle(overrides = {}) {
  return {
    current: {
      temperatureC: 29,
      humidityPct: 80,
      rainfall24hMm: 12,
      windSpeedKmh: 10,
      conditionDescription: 'Rain Showers',
      kind: 'OBSERVED',
      observedAt: now(),
    },
    forecast: [
      { date: 't+1', rainfallMm: 30, tempMinC: 24, tempMaxC: 31, windMaxKmh: 8, kind: 'FORECAST' },
    ],
    history: [],
    provider: 'Test Provider',
    retrievedAt: now(),
    source: 'open_meteo_live',
    degraded: false,
    ...overrides,
  };
}

// ── A. Coordinate validation ────────────────────────────────────────────────
describe('coordinate validation', () => {
  test('accepts valid coordinates incl. boundary extremes', () => {
    assert.ok(isValidCoordinate(16.1856, 80.7512));
    assert.ok(isValidCoordinate(-90, -180));
    assert.ok(isValidCoordinate(90, 180));
  });

  test('rejects malformed / impossible coordinates', () => {
    assert.equal(isValidCoordinate(NaN, 0), false);
    assert.equal(isValidCoordinate(0, Infinity), false);
    assert.equal(isValidCoordinate(91, 0), false);
    assert.equal(isValidCoordinate(0, -181), false);
    assert.equal(isValidCoordinate('16.18', 80), false);
    assert.equal(isValidCoordinate(null, 0), false);
    assert.equal(isValidCoordinate(undefined, undefined), false);
  });

  test('parseCoordinate returns null instead of throwing', () => {
    assert.equal(parseCoordinate('x', 'y'), null);
    assert.deepEqual(parseCoordinate(10.5, 79.0), { lat: 10.5, lng: 79.0 });
  });
});

// ── B. Polygon math ─────────────────────────────────────────────────────────
describe('polygon math', () => {
  const square = [
    { lat: 16.18, lng: 80.75 },
    { lat: 16.18, lng: 80.76 },
    { lat: 16.19, lng: 80.76 },
    { lat: 16.19, lng: 80.75 },
  ];

  test('area of ~1.1km square is positive and plausible', () => {
    const area = polygonAreaSqM(square);
    assert.ok(area > 500_000 && area < 2_000_000, `area=${area}`);
  });

  test('centroid is the vertex average', () => {
    const c = polygonCentroid(square);
    assert.ok(Math.abs(c.lat - 16.185) < 1e-9);
    assert.ok(Math.abs(c.lng - 80.755) < 1e-9);
  });

  test('isValidPolygon enforces 3–500 valid points', () => {
    assert.equal(isValidPolygon(square), true);
    assert.equal(isValidPolygon(square.slice(0, 2)), false);
    assert.equal(
      isValidPolygon([{ lat: 100, lng: 0 }, { lat: 0, lng: 0 }, { lat: 0, lng: 1 }]),
      false
    );
    assert.equal(isValidPolygon('nope'), false);
  });

  test('haversine: 1° of longitude at the equator ≈ 111 km', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    assert.ok(d > 110_000 && d < 112_000, `d=${d}`);
  });
});

// ── C. Weather validation + observed vs forecast ────────────────────────────
describe('weather validation & observed-vs-forecast', () => {
  test('degraded bundle produces a validation problem', () => {
    const problems = validateWeatherBundle(makeBundle({ degraded: true }));
    assert.ok(problems.some((p) => p.toLowerCase().includes('provider unavailable')));
  });

  test('implausible temperature/rainfall is rejected', () => {
    const b1 = makeBundle();
    b1.current.temperatureC = 90;
    assert.ok(validateWeatherBundle(b1).length > 0);
    const b2 = makeBundle();
    b2.current.rainfall24hMm = -5;
    assert.ok(validateWeatherBundle(b2).length > 0);
  });

  test('fresh observed rainfall is STRONG; forecast is MODERATE and labeled', () => {
    const items = weatherEvidenceFromBundle(makeBundle(), { lat: 16, lng: 80 });
    const rain = items.find((v) => v.item.type === 'rainfall_24h');
    const fc = items.find((v) => v.item.type === 'rainfall_forecast');
    assert.equal(rain.verdict, 'STRONG');
    assert.equal(rain.item.kind, 'OBSERVED');
    assert.equal(fc.verdict, 'MODERATE');
    assert.equal(fc.item.kind, 'FORECAST');
    assert.ok(fc.reasons.some((r) => r.includes('Forecast')));
  });

  test('stale observed weather weakens to LIMITED', () => {
    const stale = makeBundle();
    stale.current.observedAt = new Date(Date.now() - 5 * 3600_000).toISOString();
    const items = weatherEvidenceFromBundle(stale, { lat: 16, lng: 80 });
    const rain = items.find((v) => v.item.type === 'rainfall_24h');
    assert.equal(rain.verdict, 'LIMITED');
  });

  test('degraded bundle keeps verdict LIMITED (never strong)', () => {
    const items = weatherEvidenceFromBundle(makeBundle({ degraded: true }), { lat: 16, lng: 80 });
    assert.ok(items.every((v) => v.verdict === 'LIMITED'));
  });
});

// ── D. Soil provenance ──────────────────────────────────────────────────────
describe('soil report provenance', () => {
  test('regional report is MODELLED with an explicit not-a-lab-test disclaimer', () => {
    const r = getRegionalSoilReport(16.18, 80.75);
    assert.equal(r.available, true);
    assert.equal(r.provenance, 'REGIONAL_MODELLED');
    assert.ok(r.disclaimer.includes('not a field laboratory test'));
  });

  test('unavailable soil is UNKNOWN, not fabricated', () => {
    const r = getUnavailableSoilReport('Regional soil data unavailable.');
    assert.equal(r.available, false);
    assert.equal(r.provenance, 'UNKNOWN');
    assert.equal(r.properties.length, 0);
  });

  test('deterministic: same coords → same soil values', () => {
    const a = getRegionalSoilReport(16.18, 80.75);
    const b = getRegionalSoilReport(16.18, 80.75);
    assert.deepEqual(
      a.properties.map((p) => p.value),
      b.properties.map((p) => p.value)
    );
  });

  test('modelled soil verdict is LIMITED with honest reasons', () => {
    const report = getRegionalSoilReport(16.18, 80.75);
    const v = soilEvidence(report, { lat: 16, lng: 80 });
    assert.equal(v.verdict, 'LIMITED');
    assert.ok(v.reasons.some((x) => x.includes('regional/modelled')));
  });

  test('unavailable soil emits NO evidence (unknown is valid)', () => {
    const report = getUnavailableSoilReport('x');
    assert.equal(soilEvidence(report, { lat: 16, lng: 80 }), null);
  });
});

// ── E. Aggregate verdicts ───────────────────────────────────────────────────
describe('aggregate verdicts', () => {
  test('empty set → UNKNOWN with explicit reason', () => {
    const agg = aggregateVerdict([]);
    assert.equal(agg.verdict, 'UNKNOWN');
    assert.ok(agg.reasons[0].includes('No evidence'));
  });

  test('aggregate weakens to the weakest item verdict', () => {
    const agg = aggregateVerdict([
      { item: {}, verdict: 'STRONG', reasons: [] },
      { item: {}, verdict: 'LIMITED', reasons: ['⚠️ modelled'] },
    ]);
    assert.equal(agg.verdict, 'LIMITED');
  });

  test('reasons are deduplicated', () => {
    const agg = aggregateVerdict([
      { item: {}, verdict: 'STRONG', reasons: ['✓ recent'] },
      { item: {}, verdict: 'STRONG', reasons: ['✓ recent'] },
    ]);
    assert.equal(agg.reasons.filter((r) => r === '✓ recent').length, 1);
  });
});

// ── F. Plot registry (admin cascade + khasra lookup) ────────────────────────
import {
  STATES,
  divisionOptions,
  describeSelection,
} from '../.tmp-testbuild/lib/admin/divisions.js';
import {
  filterPlots,
  khasraSuggestions,
} from '../.tmp-testbuild/lib/admin/plotRegistry.js';

describe('admin division cascade', () => {
  test('all Indian states/UTs are bundled', () => {
    assert.ok(STATES.length >= 36, `expected ≥36 states, got ${STATES.length}`);
    assert.ok(STATES.includes('Andhra Pradesh'));
    assert.ok(STATES.includes('Chhattisgarh'));
  });

  test('districts only offered after a state is chosen', () => {
    assert.deepEqual(divisionOptions('district', {}), []);
    const ap = divisionOptions('district', { state: 'Andhra Pradesh' });
    assert.ok(ap.includes('Bapatla'));
    const cg = divisionOptions('district', { state: 'Chhattisgarh' });
    assert.ok(cg.includes('Raipur'));
  });

  test('deep levels require the full parent chain', () => {
    assert.deepEqual(divisionOptions('tahsil', { state: 'Andhra Pradesh' }), []);
    const tahsils = divisionOptions('tahsil', {
      state: 'Andhra Pradesh',
      district: 'Bapatla',
    });
    assert.ok(tahsils.includes('Vemuru'));
    const villages = divisionOptions('village', {
      state: 'Andhra Pradesh',
      district: 'Bapatla',
      tahsil: 'Vemuru',
      panchayat: 'Vemuru',
    });
    assert.ok(villages.includes('Vemuru'));
  });

  test('unknown state → empty children (free-text fallback, not an error)', () => {
    assert.deepEqual(divisionOptions('district', { state: 'Narnia' }), []);
  });

  test('describeSelection skips unset levels', () => {
    assert.equal(
      describeSelection({ state: 'Chhattisgarh', district: 'Raipur' }),
      'Chhattisgarh › Raipur'
    );
    assert.equal(describeSelection({}), 'No location selected');
  });
});

const mkPlot = (o) => ({
  id: o.id,
  name: o.name ?? 'P',
  khasraNo: o.khasraNo,
  location: { lat: 1, lng: 1, ...o.location },
  areaAcres: 1,
  crop: 'paddy',
  cropVariety: 'x',
  cropStage: 'tillering',
  sowingDate: '',
  soilType: 'clay',
  drainage: 'poor',
  waterSource: 'x',
  createdAt: '',
  updatedAt: '',
});

describe('plot filtering', () => {
  const plots = [
    mkPlot({
      id: 'a',
      khasraNo: '42/1B',
      location: {
        state: 'Andhra Pradesh',
        district: 'Bapatla',
        village: 'Vemuru',
      },
    }),
    mkPlot({
      id: 'b',
      khasraNo: '7/2',
      location: { state: 'Chhattisgarh', district: 'Raipur', village: 'Abhanpur' },
    }),
    mkPlot({ id: 'c', location: { state: 'Andhra Pradesh', district: 'Guntur' } }),
  ];

  test('no filters → all plots', () => {
    assert.equal(filterPlots(plots, {}).length, 3);
  });

  test('hierarchy filters match exactly (case-insensitive)', () => {
    const r = filterPlots(plots, { state: 'andhra pradesh', district: 'Bapatla' });
    assert.deepEqual(r.map((p) => p.id), ['a']);
  });

  test('unset deeper levels do not constrain', () => {
    const r = filterPlots(plots, { state: 'Andhra Pradesh' });
    assert.deepEqual(r.map((p) => p.id).sort(), ['a', 'c']);
  });

  test('khasra matches as substring', () => {
    assert.deepEqual(filterPlots(plots, {}, '42').map((p) => p.id), ['a']);
    assert.deepEqual(filterPlots(plots, {}, '7/').map((p) => p.id), ['b']);
  });

  test('khasra with no hierarchy match → empty (both must hold)', () => {
    assert.equal(filterPlots(plots, { state: 'Chhattisgarh' }, '42').length, 0);
  });

  test('khasra suggestions respect hierarchy and dedupe', () => {
    const withDupes = [...plots, mkPlot({
      id: 'd',
      khasraNo: '42/1B',
      location: { state: 'Andhra Pradesh', district: 'Bapatla', village: 'Vemuru' },
    })];
    const s = khasraSuggestions(withDupes, { state: 'Andhra Pradesh' });
    assert.deepEqual(s, ['42/1B']); // sorted, deduped, plot c has no khasra
    assert.equal(khasraSuggestions(plots, { state: 'Chhattisgarh' }).length, 1);
  });
});
