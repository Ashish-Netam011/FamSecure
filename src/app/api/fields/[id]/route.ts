import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { polygonAreaSqM, sqMToAcres } from '@/lib/geo';
import { buildFieldEvidenceContext } from '@/domain/field/context';
import { fetchFieldWeatherBundle } from '@/domain/weather/fieldBundle';
import { getRegionalSoilReport } from '@/domain/soil/adapter';
import { Farm } from '@/types';

/**
 * GET   /api/fields/:id — field + evidence context bundle (weather/soil/observation verdicts).
 * PATCH /api/fields/:id — update field (name/crop/stage/boundary/water source).
 * Coordinates are validated server-side; boundary area recomputed server-side.
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
  const weather = await fetchFieldWeatherBundle(coords);
  const soil = getRegionalSoilReport(coords.lat, coords.lng);

  const latestObs = store.getLatestCondition(farm.id);
  const context = buildFieldEvidenceContext({
    farm,
    weather,
    soil,
    latestCondition: latestObs
      ? {
          condition: latestObs.condition,
          waterDepthCm: latestObs.waterDepthCm,
          observedAt: latestObs.observedAt,
        }
      : null,
  });

  return NextResponse.json({
    success: true,
    data: {
      field: farm,
      weather,
      soil,
      latestCondition: latestObs,
      evidence: context.evidence,
      verdict: context.verdict,
      verdictReasons: context.reasons,
      missing: context.missing,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = store.getFarm(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Field not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updated: Farm = { ...existing };

    if (body.name !== undefined) updated.name = String(body.name).trim() || existing.name;

    if (body.boundary !== undefined) {
      // Reuse the store's validation by delegating: only accept valid rings.
      const ring = body.boundary;
      const ok =
        Array.isArray(ring) &&
        ring.length >= 3 &&
        ring.length <= 500 &&
        ring.every(
          (p: any) =>
            p &&
            typeof p.lat === 'number' &&
            typeof p.lng === 'number' &&
            p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180
        );
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { message: 'Invalid boundary — need 3–500 valid lat/lng points.' } },
          { status: 400 }
        );
      }
      updated.boundary = ring;
      updated.boundaryAreaAcres = sqMToAcres(polygonAreaSqM(ring));
      updated.boundaryCapturedAt = new Date().toISOString();
      updated.areaAcres = updated.boundaryAreaAcres || existing.areaAcres;
    }

    if (body.crop !== undefined) updated.crop = body.crop;
    if (body.cropStage !== undefined) updated.cropStage = body.cropStage;
    if (body.waterSource !== undefined) updated.waterSource = String(body.waterSource);
    if (body.drainage !== undefined) updated.drainage = body.drainage;
    if (body.soilType !== undefined) updated.soilType = body.soilType;

    // Plot registry fields: trim + cap at 120 chars, same rule as create.
    const cleanStr = (v: unknown): string | undefined => {
      const s = typeof v === 'string' ? v.trim() : '';
      if (!s) return undefined;
      return s.length > 120 ? s.slice(0, 120) : s;
    };
    const loc = { ...updated.location };
    if (body.state !== undefined) loc.state = cleanStr(body.state);
    if (body.district !== undefined) loc.district = cleanStr(body.district);
    if (body.tahsil !== undefined) loc.tahsil = cleanStr(body.tahsil);
    if (body.panchayat !== undefined) loc.panchayat = cleanStr(body.panchayat);
    if (body.village !== undefined) loc.village = cleanStr(body.village);
    updated.location = loc;
    if (body.khasraNo !== undefined) updated.khasraNo = cleanStr(body.khasraNo);

    // Official khasra-report details (Bhuiyan-style): farmer-entered, sanitized.
    if (body.officialRecord !== undefined) {
      const rec = body.officialRecord;
      if (rec === null) {
        updated.officialRecord = undefined; // explicit clear
      } else if (typeof rec === 'object') {
        const ownerName = String(rec.ownerName ?? '').trim().slice(0, 120);
        const areaText = String(rec.areaText ?? '').trim().slice(0, 60);
        if (!ownerName || !areaText) {
          return NextResponse.json(
            { success: false, error: { message: 'officialRecord needs ownerName and areaText from the khasra report.' } },
            { status: 400 }
          );
        }
        updated.officialRecord = {
          ownerName,
          areaText,
          landType: String(rec.landType ?? '').trim().slice(0, 120) || undefined,
          areaUnit: String(rec.areaUnit ?? '').trim().slice(0, 30) || undefined,
          coOwners: Array.isArray(rec.coOwners)
            ? rec.coOwners.map((c: unknown) => String(c).trim().slice(0, 120)).filter(Boolean).slice(0, 10)
            : undefined,
          sourcePortal: String(rec.sourcePortal ?? 'CG Bhuiyan (revenue.cg.nic.in)').trim().slice(0, 160),
          recordedAt: new Date().toISOString(),
        };
      }
    }

    const saved = store.updateFarm(updated);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
