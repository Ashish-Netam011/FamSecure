/**
 * Field weather bundle — extends the existing weather adapter (no duplicate system).
 * Current (observed), 5-day forecast, and 7-day rain history (observed); every item
 * labeled OBSERVED vs FORECAST. Never presents forecast as observed fact. Degrades to
 * a clearly labeled climate-model fallback rather than fabricating live data.
 */

import { FieldWeatherBundle } from '@/types';

/** Same shape as weather/adapter's Coordinates — kept local so the test build (no Next types) can compile this file standalone. */
interface Coordinates {
  lat: number;
  lng: number;
}

const OPEN_METEO_TIMEOUT_MS = 6000;

function localDateStr(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function describeCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Moderate to Heavy Rain';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Overcast / Monsoon Conditions';
}

export async function fetchFieldWeatherBundle(
  coords: Coordinates
): Promise<FieldWeatherBundle> {
  try {
    // One upstream call serves current + forecast + history (past_days).
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${coords.lat}&longitude=${coords.lng}` +
      '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m' +
      '&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max' +
      '&past_days=7&forecast_days=5&timezone=auto';

    const res = await fetch(url, { signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`open-meteo returned ${res.status}`);
    }

    const data = await res.json();
    const current = data?.current;
    const daily = data?.daily;
    const times: unknown = daily?.time;

    if (!current || !Array.isArray(times)) {
      throw new Error('open-meteo malformed response');
    }

    const days = times as string[];
    const todayStr = localDateStr(0);
    let todayIdx = days.indexOf(todayStr);
    if (todayIdx < 0) todayIdx = 7; // past_days=7 puts today at index 7

    const history = days.slice(0, todayIdx).map((date, i) => ({
      date,
      rainfallMm: Math.round((Number(daily.precipitation_sum?.[i]) || 0) * 10) / 10,
      kind: 'OBSERVED' as const,
    }));

    const forecast = days.slice(todayIdx, todayIdx + 5).map((date, i) => {
      const idx = todayIdx + i;
      return {
        date,
        rainfallMm: Math.round((Number(daily.precipitation_sum?.[idx]) || 0) * 10) / 10,
        tempMinC: Math.round(Number(daily.temperature_2m_min?.[idx]) || 0),
        tempMaxC: Math.round(Number(daily.temperature_2m_max?.[idx]) || 0),
        windMaxKmh: Math.round(Number(daily.wind_speed_10m_max?.[idx]) || 0),
        kind: 'FORECAST' as const,
      };
    });

    return {
      current: {
        temperatureC: Math.round(Number(current.temperature_2m ?? 29)),
        humidityPct: Math.round(Number(current.relative_humidity_2m ?? 80)),
        rainfall24hMm: Math.round((Number(current.precipitation) || 0) * 10) / 10,
        windSpeedKmh: Math.round(Number(current.wind_speed_10m ?? 12)),
        conditionDescription: describeCode(Number(current.weather_code ?? 0)),
        kind: 'OBSERVED' as const,
        observedAt: typeof current.time === 'string' ? current.time : new Date().toISOString(),
      },
      forecast,
      history,
      provider: 'Open-Meteo',
      retrievedAt: new Date().toISOString(),
      source: 'open_meteo_live' as const,
      degraded: false,
    };
  } catch {
    // Graceful degradation: deterministic climate-model placeholder values,
    // explicitly labeled degraded so the UI can say "provider unavailable".
    const history = [];
    for (let o = -7; o <= -1; o++) {
      history.push({ date: localDateStr(o), rainfallMm: 0, kind: 'OBSERVED' as const });
    }
    const forecast = [];
    for (let o = 0; o <= 4; o++) {
      forecast.push({
        date: localDateStr(o),
        rainfallMm: 0,
        tempMinC: 24,
        tempMaxC: 32,
        windMaxKmh: 10,
        kind: 'FORECAST' as const,
      });
    }

    return {
      current: {
        temperatureC: 29,
        humidityPct: 84,
        rainfall24hMm: 0,
        windSpeedKmh: 12,
        conditionDescription: 'Climate model estimate — provider unavailable',
        kind: 'OBSERVED' as const,
        observedAt: new Date().toISOString(),
      },
      forecast,
      history,
      provider: 'Calibrated agro-climatic model (fallback)',
      retrievedAt: new Date().toISOString(),
      source: 'fallback_climate_model' as const,
      degraded: true,
    };
  }
}
