import { NextResponse } from 'next/server';
import { store } from '@/domain/store';

export async function POST() {
  store.seedInitialData();
  return NextResponse.json({
    success: true,
    message: 'Demo farm and initial heavy waterlogging incident reset successfully.',
  });
}
