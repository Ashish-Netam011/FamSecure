import { NextResponse } from 'next/server';
import { isValidCoordinate } from '@/lib/geo';

/**
 * Server-side geocoding proxy (Open-Meteo-style adapter boundary):
 * the browser never calls the provider directly. Nominatim requires an
 * identifying User-Agent, which browsers cannot set — so the proxy is the
 * correct place. Fails soft with an empty result list, never an error page.
 */

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=json&limit=5&addressdetails=0`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FarmRescue/1.0 (field intelligence service)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Location search is temporarily unavailable — you can still place the pin manually.',
      });
    }

    const arr = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      type?: string;
    }>;

    const data = arr
      .map((r) => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        label: r.display_name,
        kind: r.type ?? 'place',
      }))
      .filter((r) => isValidCoordinate(r.lat, r.lng));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({
      success: true,
      data: [],
      note: 'Location search is temporarily unavailable — you can still place the pin manually.',
    });
  }
}
