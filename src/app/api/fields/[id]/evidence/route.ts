import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { buildFieldEvidenceContext } from '@/domain/field/context';
import { fetchFieldWeatherBundle } from '@/domain/weather/fieldBundle';
import { getRegionalSoilReport } from '@/domain/soil/adapter';
import { aggregateVerdict } from '@/domain/field/context';

/**
 * GET /api/fields/:id/evidence — unified evidence view for the field:
 * weather + soil + observation items, each with verdict + reasons.
 * Unknown/missing categories are listed explicitly (never hidden).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const farm = store.getFarm(params.id);
  if (!farm) {
    return NextResponse.json(
      { success: false, error: { message: 'Field not found' } },
      { status: 404 }
    );
  }

  const coords = { lat: farm.location.lat, lng: farm.location.lng };
  const [weather] = await Promise.all([fetchFieldWeatherBundle(coords)]);
  const soil = getRegionalSoilReport(coords.lat, coords.lng);
  const latestObs = store.getLatestCondition(farm.id);

  const context = buildFieldEvidenceContext({
    farm,
    weather,
    soil,
    latestCondition: latestObs
      ? { condition: latestObs.condition, waterDepthCm: latestObs.waterDepthCm, observedAt: latestObs.observedAt }
      : null,
  });

  return NextResponse.json({
    success: true,
    data: {
      evidence: context.evidence,
      verdict: context.verdict,
      verdictReasons: context.reasons,
      missing: context.missing,
      weather: { degraded: weather.degraded, provider: weather.provider },
      soil: { provenance: soil.provenance, sourceLabel: soil.sourceLabel },
    },
  });
}
