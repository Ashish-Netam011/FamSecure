import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function GET() {
  const incidents = store.getIncidents();
  return NextResponse.json({ success: true, data: incidents });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farmId, type, description, standingWaterHours, standingWaterDepthCm } = body;

    if (!type || !description) {
      return NextResponse.json(
        { success: false, error: { message: 'Incident type and description are required.' } },
        { status: 400 }
      );
    }

    const newIncident = store.createIncident({
      farmId: farmId || 'farm-001',
      type,
      description,
      standingWaterHours: Number(standingWaterHours) || 12,
      standingWaterDepthCm: Number(standingWaterDepthCm) || 10,
    });

    return NextResponse.json({ success: true, data: newIncident }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
