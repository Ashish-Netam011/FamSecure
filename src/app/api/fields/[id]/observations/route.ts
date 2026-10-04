import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { aggregateVerdict } from '@/domain/field/context';
import { EvidenceItem } from '@/types';

/**
 * GET  /api/fields/:id/observations — list recent field-condition observations.
 * POST /api/fields/:id/observations — report field condition (dry/normal/wet/
 * standing_water/waterlogged/unknown + optional depth + drainage). Server assigns
 * receivedAt and evidence IDs; condition becomes REPORTED evidence for the risk engine.
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
  return NextResponse.json({ success: true, data: farm.recentObservations ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const result = store.addFieldObservation(params.id, {
      condition: body.condition,
      waterDepthCm: body.waterDepthCm !== undefined && body.waterDepthCm !== null && body.waterDepthCm !== ''
        ? Number(body.waterDepthCm)
        : undefined,
      drainage: body.drainage,
      notes: body.notes,
      reporter: body.reporter,
    });

    if (result.error || !result.farm) {
      return NextResponse.json(
        { success: false, error: { message: result.error ?? 'Could not record observation.' } },
        { status: 400 }
      );
    }

    // Surface the verdict for provenance UI.
    const latest = result.farm.recentObservations?.[0];
    const verdict = latest
      ? aggregateVerdict([
          {
            item: result.evidence as EvidenceItem,
            verdict: latest.reporter === 'FIELD_WORKER' ? 'STRONG' : 'MODERATE',
            reasons: ['✓ Direct human observation'],
          },
        ])
      : null;

    return NextResponse.json({
      success: true,
      data: {
        observation: latest,
        evidence: result.evidence,
        verdict: verdict?.verdict ?? 'UNKNOWN',
        verdictReasons: verdict?.reasons ?? [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
