import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { explainRiskAndActions } from '@/domain/ai/adapter';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const incident = store.getIncident(params.id);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: { message: 'Incident not found' } },
        { status: 404 }
      );
    }

    const farm = store.getFarm(incident.farmId);
    if (!farm || !incident.currentAssessment || !incident.currentActionPlan) {
      return NextResponse.json(
        { success: false, error: { message: 'Incomplete incident data for explanation' } },
        { status: 400 }
      );
    }

    const explanation = await explainRiskAndActions({
      farm,
      assessment: incident.currentAssessment,
      actionPlan: incident.currentActionPlan,
      evidence: incident.evidence,
    });

    return NextResponse.json({ success: true, data: explanation });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
