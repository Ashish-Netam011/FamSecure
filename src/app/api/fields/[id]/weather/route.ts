import { NextResponse } from 'next/server';
import { store } from '@/domain/store';
import { fetchFieldWeatherBundle } from '@/domain/weather/fieldBundle';

/**
 * GET /api/fields/:id/weather — current (observed) + forecast + rain history.
 * Every item is labeled OBSERVED vs FORECAST; degraded mode is explicit.
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

  const weather = await fetchFieldWeatherBundle({
    lat: farm.location.lat,
    lng: farm.location.lng,
  });

  return NextResponse.json({
    success: true,
    data: {
      weather,
      note: weather.degraded
        ? 'Weather provider temporarily unavailable — showing calibrated model estimates, not live observations.'
        : undefined,
    },
  });
}
