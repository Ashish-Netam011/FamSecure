/**
 * Geo utilities for Field Intelligence.
 * Zero-dependency Web Mercator math, coordinate validation, and polygon helpers.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Validate a coordinate against the real-world domain. Rejects NaN, non-numbers, out-of-range. */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Parse + validate user/provider input; returns null instead of throwing. */
export function parseCoordinate(lat: unknown, lng: unknown): LatLng | null {
  if (!isValidCoordinate(lat, lng)) return null;
  return { lat: lat as number, lng: lng as number };
}

// ── Web Mercator (EPSG:3857) slippy-map math ──────────────────────────────

export function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}

export function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

export function worldXToLng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

export function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - 2 * Math.PI * (y / Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Tile xyz for a coordinate at a given zoom. */
export function latLngToTile(
  c: LatLng,
  zoom: number
): { x: number; y: number; z: number } {
  const x = Math.floor(lngToWorldX(c.lng, zoom));
  const y = Math.floor(latToWorldY(c.lat, zoom));
  const n = Math.pow(2, zoom);
  return { x, y: Math.max(0, Math.min(n - 1, y)), z: zoom };
}

// ── Polygon helpers ───────────────────────────────────────────────────────

/**
 * Planar shoelace area in square meters on a local equirectangular
 * approximation (cos(mean-lat) longitude scaling). Accurate at field scale
 * (a few hectares); intentionally NOT survey-grade.
 */
export function polygonAreaSqM(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const R = 6378137;
  const latDeg0 = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const k = R * Math.cos((latDeg0 * Math.PI) / 180) * (Math.PI / 180); // meters per degree of longitude
  const mPerDegLat = Math.PI * R / 180;
  const pts = ring.map((p) => ({
    x: p.lng * k, // meters east of lng 0 at mean latitude
    y: p.lat * mPerDegLat, // meters north of equator
  }));
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    a += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(ring: LatLng[]): LatLng | null {
  if (ring.length === 0) return null;
  const sum = ring.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length };
}

export function sqMToAcres(sqM: number): number {
  return Math.round((sqM / 4046.8564224) * 100) / 100;
}

/** Validate a polygon ring: 3–500 points, all coordinates valid. */
export function isValidPolygon(ring: unknown): ring is LatLng[] {
  if (!Array.isArray(ring) || ring.length < 3 || ring.length > 500) return false;
  return ring.every((p) => {
    if (!p || typeof p !== 'object') return false;
    const c = p as Partial<LatLng>;
    return isValidCoordinate(c.lat, c.lng);
  });
}

/** Haversine distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
