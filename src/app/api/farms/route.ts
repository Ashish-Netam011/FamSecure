import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function GET() {
  const farms = store.getFarms();
  return NextResponse.json({ success: true, data: farms });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = store.updateFarm(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 400 }
    );
  }
}
