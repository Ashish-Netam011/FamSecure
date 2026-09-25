import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const incident = store.getIncident(params.id);
  if (!incident) {
    return NextResponse.json(
      { success: false, error: { message: 'Incident not found' } },
      { status: 404 }
    );
  }

  const farm = store.getFarm(incident.farmId);
  return NextResponse.json({ success: true, data: { incident, farm } });
}
