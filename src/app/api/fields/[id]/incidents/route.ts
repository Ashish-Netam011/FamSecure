import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { buildFieldEvidenceContext } from '@/domain/field/context';
import { fetchFieldWeatherBundle } from '@/domain/weather/fieldBundle';
import { getRegionalSoilReport } from '@/domain/soil/adapter';
import { Incident } from '@/types';

const INCIDENT_TYPES = ['heavy_rain', 'waterlogging', 'heat_stress', 'pest', 'disease', 'other'];

/**
 * POST /api/fields/:id/incidents — report a problem from field context.
 *
 * Automatically attaches the field's current evidence bundle (weather
 * observations + forecast, soil context, latest water-condition observation)
 * to the incident, then runs the SAME deterministic risk engine and safety
 * gate as the wizard flow. Evidence IDs are attached by reference; external
 * raw payloads are never copied unnecessarily.
 *
 * Acceptance rule (Section 18): if the field's water condition is unconfirmed
 * on a water-type incident, the response carries an explicit
 * `insufficientEvidence` warning and requested checks — the UI shows
 * "INSUFFICIENT FIELD EVIDENCE" instead of a strong claim.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const farm = store.getFarm(params.id);
    if (!farm) {
      return NextResponse.json(
        { success: false, error: { message: 'Field not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const type = body.type as Incident['type'];
    if (!INCIDENT_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: { message: `type must be one of: ${INCIDENT_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    // Build the live field evidence context (weather + soil + observation).
    const coords = { lat: farm.location.lat, lng: farm.location.lng };
    const weather = await fetchFieldWeatherBundle(coords);
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

    const standingWaterDepthCm =
      latestObs && (latestObs.condition === 'standing_water' || latestObs.condition === 'waterlogged')
        ? latestObs.waterDepthCm
        : undefined;

    const incident: Incident = store.createIncident({
      farmId: farm.id,
      type,
      description: body.description || `Reported from field page for ${farm.name}`,
      standingWaterDepthCm,
      attachedEvidence: context.evidence,
    });

    // Safety language: water incidents with unconfirmed field condition must
    // not present a strong claim without saying what is missing.
    const isWaterIncident = type === 'waterlogging' || type === 'heavy_rain';
    const conditionUnconfirmed =
      isWaterIncident && (!latestObs || latestObs.condition === 'unknown');

    const requestedChecks: string[] = [];
    if (conditionUnconfirmed) {
      requestedChecks.push('Standing water', 'Drainage', 'Soil saturation');
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          incident,
          evidenceVerdict: context.verdict,
          evidenceReasons: context.reasons,
          missing: context.missing,
          insufficientEvidence: conditionUnconfirmed,
          requestedChecks,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
