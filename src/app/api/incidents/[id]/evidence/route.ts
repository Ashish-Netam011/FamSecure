import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { type, value, unit, source, strength, reliability } = body;

    const updated = store.addEvidence(params.id, {
      type,
      value,
      unit,
      source: source || 'farmer_observation',
      observedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      freshnessMinutes: 1,
      strength: strength || 'MODERATE',
      reliability: reliability || 'reported',
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { message: 'Incident not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
