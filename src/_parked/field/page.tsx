'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Check,
  Droplets,
  Sprout,
  FlaskConical,
  CloudRain,
  AlertTriangle,
  Info,
  ChevronDown,
  ListChecks,
  Siren,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
// PARKED IN THE CURRENT RELEASE — see src/_parked/plots/page.tsx header for restore steps.
import FieldMap, { FieldMapSelection } from '@/_parked/FieldMap';
import FieldSearch, { SearchResult } from '@/components/FieldSearch';
import { LatLng } from '@/lib/geo';
import {
  Farm,
  FieldWeatherBundle,
  SoilReport,
  EvidenceItem,
  EvidenceVerdict,
  FieldObservation,
} from '@/types';

interface FieldBundle {
  field: Farm;
  weather: FieldWeatherBundle;
  soil: SoilReport;
  latestCondition: FieldObservation | null;
  evidence: EvidenceItem[];
  verdict: EvidenceVerdict;
  verdictReasons: string[];
  missing: string[];
}

const VERDICT_STYLE: Record<string, string> = {
  STRONG: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MODERATE: 'bg-blue-100 text-blue-800 border-blue-200',
  LIMITED: 'bg-amber-100 text-amber-800 border-amber-200',
  UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200',
};

function fmtAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export default function FieldPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<FieldMapSelection | null>(null);
  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedField, setSavedField] = useState<Farm | null>(null);
  const [bundle, setBundle] = useState<FieldBundle | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Observation form state
  const [condition, setCondition] = useState<string>('unknown');
  const [waterDepth, setWaterDepth] = useState<string>('');
  const [drainage, setDrainage] = useState<string>('unknown');
  const [obsSaving, setObsSaving] = useState(false);
  const [obsNote, setObsNote] = useState<string | null>(null);

  // Incident form state
  const [incidentType, setIncidentType] = useState('waterlogging');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentBusy, setIncidentBusy] = useState(false);
  const [incidentWarn, setIncidentWarn] = useState<{
    insufficientEvidence: boolean;
    requestedChecks: string[];
    verdict: string;
  } | null>(null);

  // Deep link: /field?plot=<id> opens an existing registered plot (Plot Registry →
  // Field Intelligence). Read in an effect to avoid useSearchParams/Suspense coupling.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const plotId = new URLSearchParams(window.location.search).get('plot');
    if (!plotId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/fields/${plotId}`);
        const json = await res.json();
        if (cancelled || !json.success) return;
        const f: Farm = json.data.field;
        setSavedField(f);
        setFocusPoint({ lat: f.location.lat, lng: f.location.lng });
        await loadBundle(f.id);
      } catch {
        if (!cancelled) setError('Could not load the selected plot.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBundle = useCallback(async (fieldId: string) => {
    setLoadingBundle(true);
    setError(null);
    try {
      const res = await fetch(`/api/fields/${fieldId}`);
      const json = await res.json();
      if (json.success) setBundle(json.data);
      else setError(json.error?.message ?? 'Could not load field data.');
    } catch {
      setError('Could not reach the FarmRescue server for field data.');
    } finally {
      setLoadingBundle(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!selection) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selection.pin.lat,
          lng: selection.pin.lng,
          locationSource: selection.source,
          accuracyMeters: selection.accuracyMeters,
          boundary: selection.polygon ?? undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedField(json.data);
        setReportOpen(false);
        await loadBundle(json.data.id);
      } else {
        setError(json.error?.message ?? 'Could not save the field.');
      }
    } catch {
      setError('Could not reach the server to save the field.');
    } finally {
      setSaving(false);
    }
  };

  const submitObservation = async () => {
    if (!savedField) return;
    setObsSaving(true);
    setObsNote(null);
    try {
      const res = await fetch(`/api/fields/${savedField.id}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition,
          waterDepthCm: waterDepth === '' ? undefined : Number(waterDepth),
          drainage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setObsNote(
          `Observation recorded (evidence strength: ${json.data.verdict}). Reloaded field data.`
        );
        await loadBundle(savedField.id);
      } else {
        setObsNote(json.error?.message ?? 'Could not record observation.');
      }
    } catch {
      setObsNote('Could not reach the server.');
    } finally {
      setObsSaving(false);
    }
  };

  const reportIncident = async () => {
    if (!savedField) return;
    setIncidentBusy(true);
    setIncidentWarn(null);
    try {
      const res = await fetch(`/api/fields/${savedField.id}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: incidentType, description: incidentDesc }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data.insufficientEvidence) {
          setIncidentWarn({
            insufficientEvidence: true,
            requestedChecks: json.data.requestedChecks,
            verdict: json.data.evidenceVerdict,
          });
          // Stay on page so the farmer can report the condition first.
        } else {
          router.push(`/incidents/${json.data.incident.id}`);
        }
      } else {
        setError(json.error?.message ?? 'Could not create the incident.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setIncidentBusy(false);
    }
  };

  const W = bundle?.weather;
  const soil = bundle?.soil;
  const latest = bundle?.latestCondition;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" /> Field Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Locate your field on the map — FarmRescue loads weather, soil and water context
            with full evidence provenance. Unknown data is shown as unknown.
          </p>
        </div>
        {savedField && (
          <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2">
            ✓ Field saved: <span className="font-bold">{savedField.name}</span>
          </div>
        )}
      </div>

      {/* Search + map */}
      <div className="space-y-3">
        <FieldSearch
          onPick={(r: SearchResult) => {
            // Search moves the map; the farmer still confirms the pin.
            const p = { lat: r.lat, lng: r.lng };
            setFocusPoint(p);
            setSelection({
              pin: p,
              polygon: null,
              areaAcres: null,
              source: 'SEARCH',
              accuracyMeters: null,
            });
          }}
        />
        <FieldMap
          initialSelection={selection ? { pin: selection.pin } : undefined}
          focusPoint={focusPoint}
          onSelectionChange={(s) => setSelection(s)}
        />
      </div>

      {/* Confirm bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          {selection ? (
            <>
              <span className="font-bold text-slate-800">Selected field location:</span>{' '}
              {selection.pin.lat.toFixed(5)}, {selection.pin.lng.toFixed(5)}
              {selection.source === 'GPS' && ' (from GPS)'}
              {selection.polygon && ` · boundary ~${selection.areaAcres} acres (user-marked)`}
            </>
          ) : (
            'Tap the map to drop a pin, or use your current location.'
          )}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!selection || saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4" /> {saving ? 'Saving…' : '✓ Confirm field'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Loading state for bundle */}
      {loadingBundle && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Loading field data…
        </div>
      )}

      {/* Field overview cards */}
      {bundle && !loadingBundle && (
        <>
          {/* Verdict banner */}
          <div className={`rounded-2xl border p-4 ${VERDICT_STYLE[bundle.verdict] ?? VERDICT_STYLE.UNKNOWN}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-sm uppercase tracking-wide">
                  Field evidence strength: {bundle.verdict}
                </div>
                <ul className="mt-1.5 text-xs leading-relaxed list-none space-y-0.5">
                  {bundle.verdictReasons.slice(0, 4).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setShowEvidence((v) => !v)}
                className="text-xs font-bold underline underline-offset-2 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> {showEvidence ? 'Hide' : 'View all evidence'}
              </button>
            </div>
            {bundle.missing.length > 0 && (
              <div className="mt-2.5 text-xs flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Unknown / missing: {bundle.missing.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Evidence drawer */}
          {showEvidence && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-600" /> Evidence provenance
              </div>
              {bundle.evidence.map((e) => (
                <div key={e.id} className="border border-slate-100 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">
                      {e.type.replace(/_/g, ' ')} {e.unit ? `(${e.unit})` : ''}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border font-bold ${VERDICT_STYLE[e.verdict ?? 'UNKNOWN']}`}>
                      {e.verdict ?? 'REPORTED'}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-600">
                    Value: <span className="font-mono font-bold">{String(e.value)}</span> · Kind:{' '}
                    <span className="font-bold">{e.kind ?? 'REPORTED'}</span> · Source:{' '}
                    {e.source.replace(/_/g, ' ')}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Observed {fmtAgo(e.observedAt)} · received {fmtAgo(e.retrievedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* WEATHER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-slate-800 mb-3">
                <CloudRain className="w-5 h-5 text-blue-600" /> Weather
                {W?.degraded && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    PROVIDER OFFLINE — MODEL ESTIMATE
                  </span>
                )}
              </div>

              {W && (
                <>
                  <div className="text-sm text-slate-700 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Temperature</span>
                      <span className="font-bold">{W.current.temperatureC}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Humidity</span>
                      <span className="font-bold">{W.current.humidityPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rain, last 24 h</span>
                      <span className="font-bold">{W.current.rainfall24hMm} mm — observed</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Forecast (next 5 days)
                    </div>
                    <div className="space-y-1">
                      {W.forecast.map((f) => (
                        <div key={f.date} className="flex justify-between text-xs">
                          <span className="text-slate-600">{f.date}</span>
                          <span className="font-medium text-slate-700">
                            {f.rainfallMm} mm — <span className="text-blue-600 font-bold">forecast</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Recent rainfall (observed)
                    </div>
                    <div className="flex gap-3 text-xs">
                      {[
                        { label: 'Today', v: W.history[W.history.length - 1]?.rainfallMm ?? 0 },
                        { label: 'Yesterday', v: W.history[W.history.length - 2]?.rainfallMm ?? 0 },
                        {
                          label: '7-day total',
                          v: Math.round(W.history.reduce((s, h) => s + h.rainfallMm, 0) * 10) / 10,
                        },
                      ].map((x) => (
                        <div key={x.label} className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                          <div className="font-black text-slate-800">{x.v} mm</div>
                          <div className="text-slate-500">{x.label} · observed</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400">
                    Source: {W.provider} · updated {fmtAgo(W.retrievedAt)} · imagery not real-time
                  </div>
                </>
              )}
            </div>

            {/* SOIL */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-slate-800 mb-3">
                <FlaskConical className="w-5 h-5 text-amber-600" /> Soil
              </div>
              {soil && soil.available ? (
                <>
                  <div className="text-sm text-slate-700 space-y-1.5">
                    {soil.properties.map((p) => (
                      <div key={p.key} className="flex justify-between">
                        <span>{p.label}</span>
                        <span className="font-bold">
                          {p.value}
                          {p.unit ?? ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
                    <div className="font-bold">Source: {soil.sourceLabel}</div>
                    <div className="mt-0.5">{soil.disclaimer}</div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
                  Unknown — no reliable soil data available.{' '}
                  {soil?.unavailableReason && `(${soil.unavailableReason})`}
                </div>
              )}
            </div>

            {/* WATER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between gap-2 font-black text-slate-800 mb-3">
                <span className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-600" /> Water — field condition
                </span>
                {latest && (
                  <span className="text-xs font-medium text-slate-500">
                    last reported {fmtAgo(latest.observedAt)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {latest ? (
                  <>
                    <span className="bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-xl px-3 py-1.5 font-bold capitalize">
                      {latest.condition.replace(/_/g, ' ')}
                    </span>
                    {latest.waterDepthCm !== undefined && (
                      <span className="text-slate-600">depth {latest.waterDepthCm} cm</span>
                    )}
                    {latest.drainage && latest.drainage !== 'unknown' && (
                      <span className="text-slate-600">drainage: {latest.drainage}</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    Unknown — field condition not reported
                  </span>
                )}
              </div>

              {/* Report condition form */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  How is your field right now?
                </div>
                <div className="flex flex-wrap gap-2">
                  {['dry', 'normal', 'wet', 'standing_water', 'waterlogged', 'unknown'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold capitalize transition-colors ${
                        condition === c
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c === 'unknown' ? "I don't know" : c.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 items-center">
                  <label className="text-xs text-slate-600 font-medium">
                    Water depth (cm):
                    <input
                      value={waterDepth}
                      onChange={(e) => setWaterDepth(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="ml-2 w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="—"
                      inputMode="decimal"
                    />
                  </label>
                  <label className="text-xs text-slate-600 font-medium">
                    Drainage:
                    <select
                      value={drainage}
                      onChange={(e) => setDrainage(e.target.value)}
                      className="ml-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="good">Good</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                  <button
                    onClick={submitObservation}
                    disabled={obsSaving}
                    className="ml-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-sm"
                  >
                    {obsSaving ? 'Saving…' : 'Submit observation'}
                  </button>
                </div>
                {obsNote && <div className="mt-2 text-xs text-emerald-700">{obsNote}</div>}
              </div>
            </div>
          </div>

          {/* Report a problem */}
          <div className="bg-white border-2 border-red-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-slate-800 mb-3">
              <Siren className="w-5 h-5 text-red-600" /> Report a problem from this field
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ['waterlogging', 'Flooding / Waterlogging'],
                ['heavy_rain', 'Heavy Rain'],
                ['heat_stress', 'Drought / Heat Stress'],
                ['pest', 'Pest'],
                ['disease', 'Disease'],
                ['other', 'Other / Crop Damage'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setIncidentType(v)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    incidentType === v
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              placeholder="Describe what you see (optional)…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              rows={2}
            />
            <button
              onClick={reportIncident}
              disabled={incidentBusy}
              className="mt-3 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2"
            >
              <Siren className="w-4 h-4" />
              {incidentBusy ? 'Assessing…' : 'Report a problem'}
            </button>

            {incidentWarn && (
              <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
                <div className="font-black text-amber-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> INSUFFICIENT FIELD EVIDENCE
                </div>
                <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                  Heavy rainfall / risk signals were detected, but the current field water
                  condition has not been confirmed, so no strong conclusion was drawn
                  (evidence strength: {incidentWarn.verdict}). Please check and report:
                </p>
                <ul className="mt-2 space-y-1">
                  {incidentWarn.requestedChecks.map((c) => (
                    <li key={c} className="text-xs text-amber-800 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" /> {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-700 mt-2">
                  The incident was still created with all attached evidence — open it to follow
                  the deterministic plan, or report your field condition above first.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => router.push(`/incidents/${incidentWarn ? '' : ''}`)}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state before confirmation */}
      {!savedField && !loadingBundle && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
          <Sprout className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          Search for your village, drop a pin on the map, and confirm the field —
          weather, soil and water context load automatically with full provenance.
        </div>
      )}
    </div>
  );
}
