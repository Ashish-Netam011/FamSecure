import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { situationImproved, actionsHelpful, observedDamage, cropCondition, farmerFeedback } = body;

    const updated = store.submitOutcome(params.id, {
      situationImproved: situationImproved || 'yes',
      actionsHelpful: actionsHelpful || 'yes',
      observedDamage: observedDamage || 'Minimal leaf yellowing, recovered within 48h',
      cropCondition: cropCondition || 'Healthy tillering',
      farmerFeedback: farmerFeedback || 'Bund breach action saved the crop in time!',
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
