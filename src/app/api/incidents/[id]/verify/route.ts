import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, observation, verifiedSeverity, workerName, notes } = body;

    const updated = store.submitVerification(params.id, {
      workerId: 'worker-ramesh',
      workerName: workerName || 'Ramesh Kumar (Agri Field Officer)',
      status: status || 'CONFIRMED',
      observation: observation || 'Field visit verified acute water accumulation.',
      verifiedSeverity,
      notes: notes || 'Bund breach recommended immediately.',
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
