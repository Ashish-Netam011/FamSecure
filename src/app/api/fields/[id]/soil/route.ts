import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { getRegionalSoilReport, getUnavailableSoilReport } from '@/domain/soil/adapter';

/**
 * GET /api/fields/:id/soil — regional/modelled soil report.
 * Provenance-first: REGIONAL_MODELLED with an explicit not-a-lab-test disclaimer.
 * Never claims field-measured accuracy.
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

  try {
    const soil = getRegionalSoilReport(farm.location.lat, farm.location.lng);
    return NextResponse.json({ success: true, data: soil });
  } catch {
    const soil = getUnavailableSoilReport('Regional soil data unavailable for this location.');
    return NextResponse.json({ success: true, data: soil });
  }
}
