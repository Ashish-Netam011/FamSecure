'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Layers,
  PenLine,
  Trash2,
  RotateCcw,
  Check,
  Loader2,
} from 'lucide-react';
import {
  LatLng,
  latLngToTile,
  lngToWorldX,
  latToWorldY,
  worldXToLng,
  worldYToLat,
  polygonAreaSqM,
  sqMToAcres,
  isValidCoordinate,
} from '@/lib/geo';

export type MapStyle = 'standard' | 'satellite' | 'hybrid';

/** A registered plot rendered as an overlay chip on the map (plot registry). */
export interface PlotMarker {
  id: string;
  /** Khasra / plot number shown on the label chip. */
  label: string;
  lat: number;
  lng: number;
  boundary?: Array<{ lat: number; lng: number }> | null;
  selected?: boolean;
}

export interface FieldMapSelection {
  pin: LatLng;
  polygon: LatLng[] | null;
  areaAcres: number | null;
  source: 'GPS' | 'SEARCH' | 'MANUAL_PIN';
  accuracyMeters: number | null;
}

interface FieldMapProps {
  initialCenter?: LatLng;
  initialZoom?: number;
  initialSelection?: Partial<FieldMapSelection>;
  /** Changing this recenters the map and moves the pin (e.g. search result picked). */
  focusPoint?: LatLng | null;
  /** Registered plots to draw as overlay chips (plot registry view). */
  plots?: PlotMarker[];
  /** Fly-to target for inspecting a plot — moves view WITHOUT touching the selection pin. */
  inspectTarget?: { center: LatLng; zoom?: number; nonce: number } | null;
  onPlotClick?: (id: string) => void;
  onSelectionChange?: (s: FieldMapSelection) => void;
  onConfirm?: (s: FieldMapSelection) => void;
}

/** Never claims imagery is real-time or survey-grade. */
const IMAGERY_NOTE =
  'Satellite imagery may not clearly show this field — it is not real-time. Use your current location or manually move the pin.';

type TileDef = { url: (x: number, y: number, z: number) => string; attribution: string };

const TILE_STYLES: Record<MapStyle, { base: TileDef; labels?: TileDef }> = {
  standard: {
    base: {
      url: (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      attribution: '© OpenStreetMap contributors',
    },
  },
  satellite: {
    base: {
      url: (x, y, z) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  hybrid: {
    base: {
      url: (x, y, z) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    labels: {
      url: (x, y, z) => `https://tiles.stadiamaps.com/tiles/stamen_toner_labels_only/${z}/${x}/${y}.png`,
      attribution: 'Labels © Stadia Maps © Stamen Design',
    },
  },
};

export default function FieldMap({
  initialCenter = { lat: 16.1856, lng: 80.7512 },
  initialZoom = 15,
  initialSelection,
  focusPoint,
  plots = [],
  inspectTarget = null,
  onPlotClick,
  onSelectionChange,
  onConfirm,
}: FieldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [center, setCenter] = useState<LatLng>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [style, setStyle] = useState<MapStyle>('satellite');
  const [pin, setPin] = useState<LatLng | null>(initialSelection?.pin ?? null);
  const [polygon, setPolygon] = useState<LatLng[] | null>(initialSelection?.polygon ?? null);
  const [draftPoly, setDraftPoly] = useState<LatLng[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dragState = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  // Reactive focus: recenter + pin when a search result (or saved field) is picked.
  useEffect(() => {
    if (!focusPoint || !isValidCoordinate(focusPoint.lat, focusPoint.lng)) return;
    setCenter(focusPoint);
    setPin(focusPoint);
    setZoom((z) => Math.max(z, 15));
    setNotice('Selected field location — drag the map to adjust, then confirm.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoint?.lat, focusPoint?.lng]);

  // Plot inspection: recenters on a registry plot WITHOUT altering the pin
  // (the pin belongs to the field-selection flow, not to plot browsing).
  useEffect(() => {
    if (!inspectTarget || !isValidCoordinate(inspectTarget.center.lat, inspectTarget.center.lng)) return;
    setCenter(inspectTarget.center);
    setZoom((z) => Math.max(inspectTarget.zoom ?? z, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectTarget?.nonce]);

  // Observe container size for responsive tile grid.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const emit = useCallback(
    (next: Partial<FieldMapSelection>) => {
      const s: FieldMapSelection = {
        pin: next.pin ?? pin ?? initialCenter,
        polygon: next.polygon !== undefined ? next.polygon : polygon,
        areaAcres:
          next.areaAcres !== undefined
            ? next.areaAcres
            : polygon && polygon.length >= 3
              ? sqMToAcres(polygonAreaSqM(polygon))
              : null,
        source: next.source ?? 'MANUAL_PIN',
        accuracyMeters: next.accuracyMeters ?? null,
      };
      onSelectionChange?.(s);
    },
    [pin, polygon, onSelectionChange, initialCenter]
  );

  // ── Pointer interactions ────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (drawing) return; // drawing mode uses clicks to add vertices
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      x: e.clientX,
      y: e.clientY,
      cx: lngToWorldX(center.lng, zoom),
      cy: latToWorldY(center.lat, zoom),
    };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      setCenter({
        lat: worldYToLat(st.cy - dy, zoom),
        lng: worldXToLng(st.cx - dx, zoom),
      });
    }
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragState.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const worldX = lngToWorldX(center.lng, zoom) + (e.clientX - rect.left - size.w / 2);
    const worldY = latToWorldY(center.lat, zoom) + (e.clientY - rect.top - size.h / 2);
    const clicked: LatLng = {
      lat: worldYToLat(worldY, zoom),
      lng: worldXToLng(worldX, zoom),
    };

    if (drawing) {
      setDraftPoly((d) => [...d, clicked]);
      return;
    }
    setPin(clicked);
    setNotice('Selected field location — drag the map to adjust, then confirm.');
    emit({ pin: clicked, source: 'MANUAL_PIN', accuracyMeters: null });
  };

  // ── Zoom ────────────────────────────────────────────────────────────────
  const clampZoom = (z: number) => Math.max(3, Math.min(19, z));

  const zoomIn = () => setZoom((z) => clampZoom(z + 1));
  const zoomOut = () => setZoom((z) => clampZoom(z - 1));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? 1 : -1)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── GPS ─────────────────────────────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setNotice('Geolocation is not available in this browser. Search or place the pin manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(c);
        setCenter(c);
        setZoom(16);
        setNotice('Using your current location — adjust the pin if needed, then confirm.');
        emit({ pin: c, source: 'GPS', accuracyMeters: pos.coords.accuracy ?? null });
        setLocating(false);
      },
      (err: GeolocationPositionError) => {
        setLocating(false);
        // Diagnose the real cause: site block vs no GPS fix vs timeout.
        // Windows "Location" ON does not guarantee a fix — the browser site
        // permission and "let desktop apps use location" are separate layers.
        const fallback = `Could not get your location (${err.message || 'unknown error'}). Search for your field or place the pin manually.`;
        const report = (msg: string) => setNotice(msg);
        const perms = typeof navigator !== 'undefined' ? (navigator as Navigator & { permissions?: Permissions }).permissions : undefined;
        if (perms && typeof perms.query === 'function') {
          perms
            .query({ name: 'geolocation' as PermissionName })
            .then((st) => {
              if (err.code === err.PERMISSION_DENIED || st.state === 'denied') {
                report(
                  st.state === 'denied'
                    ? 'Location is BLOCKED for this site. Click the icon left of the address bar → Location → “Allow” → reload, then try again.'
                    : 'The location request was denied before a fix could be found. Allow Location via the address-bar icon and retry.'
                );
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                report(
                  'The device could not determine a position (no GPS/Wi-Fi fix). Check Windows Settings → Privacy & security → Location → “Let desktop apps access your location” is On, then retry. Search or a manual pin also works.'
                );
              } else if (err.code === err.TIMEOUT) {
                report('Getting your location timed out. Try again near open sky — or place the pin manually.');
              } else {
                report(fallback);
              }
            })
            .catch(() => report(fallback));
        } else {
          report(fallback);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // ── Polygon completion ──────────────────────────────────────────────────
  const finishPolygon = () => {
    if (draftPoly.length < 3) {
      setNotice('A field boundary needs at least 3 points.');
      return;
    }
    setPolygon(draftPoly);
    setDraftPoly([]);
    setDrawing(false);
    const acres = sqMToAcres(polygonAreaSqM(draftPoly));
    setNotice(`User-marked field boundary saved (~${acres} acres). Not survey-grade.`);
    emit({ polygon: draftPoly, areaAcres: acres });
  };

  const clearPolygon = () => {
    setPolygon(null);
    setDraftPoly([]);
    setDrawing(false);
    emit({ polygon: null, areaAcres: null });
  };

  const canConfirm = !!pin && isValidCoordinate(pin.lat, pin.lng);

  // ── Tile grid ───────────────────────────────────────────────────────────
  const tiles: React.ReactNode[] = [];
  if (size.w > 0 && size.h > 0) {
    const cx = lngToWorldX(center.lng, zoom);
    const cy = latToWorldY(center.lat, zoom);
    const cols = Math.ceil(size.w / 256) + 1;
    const rows = Math.ceil(size.h / 256) + 1;
    const startCol = Math.floor(cx - size.w / 2 / 256);
    const startRow = Math.floor(cy - size.h / 2 / 256);
    const n = Math.pow(2, zoom);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = startCol + c;
        const ty = startRow + r;
        if (ty < 0 || ty >= n) continue;
        const px = (tx - cx) * 256 + size.w / 2;
        const py = (ty - cy) * 256 + size.h / 2;
        const styleDef = TILE_STYLES[style];
        const url = styleDef.base.url(((tx % n) + n) % n, ((ty % n) + n) % n, zoom);
        tiles.push(
          <img
            key={`base-${style}-${zoom}-${tx}-${ty}`}
            src={url}
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: px, top: py, width: 256, height: 256, userSelect: 'none' }}
          />
        );
        if (styleDef.labels) {
          tiles.push(
            <img
              key={`labels-${zoom}-${tx}-${ty}`}
              src={styleDef.labels.url(((tx % n) + n) % n, ((ty % n) + n) % n, zoom)}
              alt=""
              draggable={false}
              style={{ position: 'absolute', left: px, top: py, width: 256, height: 256, userSelect: 'none', pointerEvents: 'none' }}
            />
          );
        }
      }
    }
  }

  // Project a coordinate to container pixels.
  const project = (p: LatLng) => {
    const cx = lngToWorldX(center.lng, zoom);
    const cy = latToWorldY(center.lat, zoom);
    return {
      x: (lngToWorldX(p.lng, zoom) - cx) * 256 + size.w / 2,
      y: (latToWorldY(p.lat, zoom) - cy) * 256 + size.h / 2,
    };
  };

  const pinPx = pin ? project(pin) : null;
  const polyPts = polygon?.map(project) ?? [];
  const draftPts = draftPoly.map(project);

  return (
    <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100">
      {/* Tile canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        role="application"
        aria-label="Field location map"
      >
        {tiles}
        {/* Polygon fill + outline */}
        {polyPts.length >= 3 && (
          <>
            <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h}>
              <polygon
                points={polyPts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(16,185,129,0.25)"
                stroke="#059669"
                strokeWidth={3}
              />
              {polyPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={5} fill="#059669" stroke="white" strokeWidth={2} />
              ))}
            </svg>
          </>
        )}
        {/* Draft polygon */}
        {draftPts.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h}>
            <polyline
              points={draftPts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth={3}
              strokeDasharray="7 5"
 />
            {draftPts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={5} fill="#2563eb" stroke="white" strokeWidth={2} />
            ))}
          </svg>
        )}
        {/* Registered plot overlays (chips + boundaries) */}
        {plots.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h}>
            {plots
              .filter((p) => p.boundary && p.boundary.length >= 3)
              .map((p) => (
                <polygon
                  key={`pb-${p.id}`}
                  points={(p.boundary ?? [])
                    .map((b) => project(b))
                    .map((q) => `${q.x},${q.y}`)
                    .join(' ')}
                  fill={p.selected ? 'rgba(16,185,129,0.30)' : 'rgba(59,130,246,0.18)'}
                  stroke={p.selected ? '#059669' : '#3b82f6'}
                  strokeWidth={p.selected ? 3 : 2}
                  strokeDasharray="6 4"
                />
              ))}
          </svg>
        )}
        {plots.map((p) => {
          const pp = project({ lat: p.lat, lng: p.lng });
          return (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // don't drop the selection pin
                onPlotClick?.(p.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-auto group"
              style={{ left: pp.x, top: pp.y }}
              aria-label={`Plot ${p.label}`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125 ${
                  p.selected ? 'bg-emerald-500 ring-4 ring-emerald-300' : 'bg-blue-500'
                }`}
              />
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow whitespace-nowrap ${
                  p.selected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/95 text-slate-700 border border-slate-200'
                }`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
        {/* Pin */}
        {pinPx && (
          <div
            className="absolute pointer-events-none"
            style={{ left: pinPx.x, top: pinPx.y, transform: 'translate(-50%, -100%)' }}
          >
            <MapPin className="w-10 h-10 text-red-600 drop-shadow-lg" fill="#dc2626" stroke="white" strokeWidth={1.5} />
          </div>
        )}
        {/* Center crosshair while dragging (spatial continuity cue) */}
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-white rounded-full shadow-lg opacity-70" />
          </div>
        )}
      </div>

      {/* Style switcher */}
      <div className="absolute top-3 left-3 flex rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white/95 backdrop-blur text-xs font-bold">
        {(['standard', 'satellite', 'hybrid'] as MapStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`px-3 py-2 capitalize transition-colors ${
              style === s ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white/95 text-slate-700">
        <button onClick={zoomIn} className="w-9 h-9 font-black hover:bg-slate-100" aria-label="Zoom in">+</button>
        <button onClick={zoomOut} className="w-9 h-9 font-black hover:bg-slate-100 border-t border-slate-200" aria-label="Zoom out">−</button>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <button
          onClick={handleUseMyLocation}
          disabled={locating}
          className="px-3.5 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-lg text-sm font-bold text-slate-700 hover:bg-white flex items-center gap-2 disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-blue-600" />}
          📍 Use my location
        </button>
        <div className="flex gap-2">
          {!drawing ? (
            <button
              onClick={() => { setDrawing(true); setDraftPoly([]); }}
              className="px-3.5 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-lg text-sm font-bold text-slate-700 hover:bg-white flex items-center gap-2"
            >
              <PenLine className="w-4 h-4 text-emerald-600" /> Draw boundary
            </button>
          ) : (
            <>
              <button
                onClick={finishPolygon}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white shadow-lg text-sm font-bold flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Close ({draftPoly.length})
              </button>
              <button
                onClick={() => { setDrawing(false); setDraftPoly([]); }}
                className="px-3.5 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-lg text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
            </>
          )}
          {polygon && !drawing && (
            <button
              onClick={clearPolygon}
              className="px-3 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-lg text-sm font-bold text-red-600 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Attribution + imagery honesty note */}
      <div className="absolute bottom-0 right-0 bg-black/45 text-white text-[10px] px-2 py-0.5 rounded-tl-lg pointer-events-none">
        {TILE_STYLES[style].base.attribution} · Imagery is not real-time
      </div>

      {/* Notice toast */}
      {notice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 max-w-[90%] bg-slate-900/90 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl text-center leading-relaxed">
          {notice}
          <button
            onClick={() => setNotice(null)}
            className="ml-2 underline underline-offset-2 font-bold"
          >
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}
