import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { buildFieldEvidenceContext } from '@/domain/field/context';
import { fetchFieldWeatherBundle } from '@/domain/weather/fieldBundle';
import { getRegionalSoilReport } from '@/domain/soil/adapter';
import { polygonAreaSqM, sqMToAcres } from '@/lib/geo';
import { Farm } from '@/types';

/**
 * Field Intelligence APIs:
 * - GET  /api/fields → list fields
 * - POST /api/fields → create field from map selection (server-validated)
 * (GET/PATCH /api/fields/:id live in the dynamic route; sub-resources under [id]/)
 */

export async function GET() {
  return NextResponse.json({ success: true, data: store.getFarms() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = store.createField({
      name: body.name,
      lat: Number(body.lat),
      lng: Number(body.lng),
      locationSource: body.locationSource,
      locationAccuracyMeters: body.accuracyMeters !== undefined ? Number(body.accuracyMeters) : undefined,
      boundary: body.boundary,
      crop: body.crop,
      cropStage: body.cropStage,
      // Plot registry: administrative hierarchy + land-record number.
      state: body.state,
      district: body.district,
      tahsil: body.tahsil,
      panchayat: body.panchayat,
      village: body.village,
      khasraNo: body.khasraNo,
      officialRecord: body.officialRecord,
    });

    if (result.error || !result.farm) {
      return NextResponse.json(
        { success: false, error: { message: result.error ?? 'Could not create field.' } },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, data: result.farm }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
