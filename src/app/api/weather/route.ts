import { NextResponse } from 'next/server';
import { fetchLiveWeather } from '@/domain/weather/adapter';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat')) || 16.1856;
  const lng = Number(searchParams.get('lng')) || 80.7512;

  const weather = await fetchLiveWeather({ lat, lng });
  return NextResponse.json({ success: true, data: weather });
}
