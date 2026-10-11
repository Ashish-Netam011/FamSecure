'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Map as MapIcon,
  MapPin,
  Loader2,
  Check,
  Search,
  LocateFixed,
  Sprout,
  Ruler,
  ChevronRight,
  Layers,
} from 'lucide-react';
// PARKED IN THE CURRENT RELEASE — restore by moving this folder back (paths in this comment):
//   src/_parked/plots/page.tsx  → src/app/plots/page.tsx
//   src/_parked/field/page.tsx  → src/app/field/page.tsx
//   src/_parked/FieldMap.tsx    → src/components/FieldMap.tsx
//   (and re-add the two Navbar links; imports use @/_parked/FieldMap meanwhile)
import FieldMap, { PlotMarker, FieldMapSelection } from '@/_parked/FieldMap';
import { LatLng } from '@/lib/geo';
import { Farm, OfficialRecord } from '@/types';
import {
  ADMIN_LABELS,
  ADMIN_LEVELS,
  AdminLevel,
  AdminSelection,
  divisionOptions,
  describeSelection,
  matchState,
} from '@/lib/admin/divisions';
import { filterPlots, khasraSuggestions } from '@/lib/admin/plotRegistry';

const DETAIL_ROW = 'flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0';

/** One cascade level: datalist-backed input (bundled options + free text fallback). */
function CascadeInput({
  level,
  sel,
  value,
  onChange,
  disabled,
}: {
  level: AdminLevel;
  sel: AdminSelection;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const options = useMemo(() => divisionOptions(level, sel), [level, sel]);
  const listId = `div-${level}`;
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {ADMIN_LABELS[level]}
        {level === 'village' && <span className="text-slate-400 normal-case"> (gaon)</span>}
      </span>
      <input
        list={listId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          disabled
            ? 'Select the level above first'
            : options.length
              ? `Choose or type ${ADMIN_LABELS[level].toLowerCase()}…`
              : `Type ${ADMIN_LABELS[level].toLowerCase()} (no reference list)`
        }
        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <LevelHint level={level} sel={sel} />
    </label>
  );
}

/** Honest hint: is the typed name in the bundled reference list (never a gate). */
function LevelHint({ level, sel }: { level: AdminLevel; sel: AdminSelection }) {
  const ms = matchState(level, sel);
  if (ms === 'matched') {
    return (
      <span className="mt-1 block text-[11px] font-semibold text-emerald-600">
        ✓ In reference list
      </span>
    );
  }
  if (ms === 'unlisted') {
    return (
      <span className="mt-1 block text-[11px] font-semibold text-amber-600">
        ⚠ Not in the bundled list — will be saved exactly as typed
      </span>
    );
  }
  return null;
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<AdminSelection>({});
  const [khasra, setKhasra] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspect, setInspect] = useState<{ center: LatLng; zoom?: number; nonce: number } | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<FieldMapSelection | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [savingRec, setSavingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recForm, setRecForm] = useState({
    ownerName: '',
    areaText: '',
    areaUnit: 'hectare',
    landType: '',
    coOwners: '',
  });

  const loadPlots = useCallback(async () => {
    try {
      const res = await fetch('/api/fields');
      const json = await res.json();
      if (json.success) setPlots(json.data as Farm[]);
    } catch {
      /* offline: registry keeps last loaded data; empty state explains */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlots();
  }, [loadPlots]);

  // Client-side lookup over the full registry (tiny dataset, instant UX).
  const matches = useMemo(() => filterPlots(plots, sel, khasra), [plots, sel, khasra]);
  const selected = matches.find((p) => p.id === selectedId) ?? null;
  const khasraOptions = useMemo(() => khasraSuggestions(plots, sel), [plots, sel]);

  const markers: PlotMarker[] = useMemo(
    () =>
      matches.map((p) => ({
        id: p.id,
        label: p.khasraNo ? `Khasra ${p.khasraNo}` : p.name,
        lat: p.location.lat,
        lng: p.location.lng,
        boundary: p.boundary ?? null,
        selected: p.id === selectedId,
      })),
    [matches, selectedId]
  );

  const setLevel = (level: AdminLevel, v: string) => {
    setSel((prev) => {
      const next: AdminSelection = { ...prev, [level]: v };
      // Changing a parent clears every deeper level (cascade semantics).
      const idx = ADMIN_LEVELS.indexOf(level);
      for (let i = idx + 1; i < ADMIN_LEVELS.length; i++) delete next[ADMIN_LEVELS[i]];
      return next;
    });
    setSelectedId(null);
  };

  const pickPlot = useCallback(
    (id: string) => {
      const p = plots.find((x) => x.id === id);
      if (!p) return;
      setSelectedId(id);
      setInspect({ center: { lat: p.location.lat, lng: p.location.lng }, nonce: Date.now() });
      setNotice(null);
      setRecOpen(false);
      setRecError(null);
    },
    [plots]
  );

  // Core registry flow: when the filter narrows to exactly one plot, select it
  // automatically — details card and map position load together, no extra click.
  useEffect(() => {
    if (!loading && matches.length === 1 && matches[0].id !== selectedId) {
      pickPlot(matches[0].id);
    }
  }, [loading, matches, selectedId, pickPlot]);

  // Zero-match dead end: register the searched plot from a pin on the map.
  // The server validates coordinates/hierarchy and stores it as REGISTERED.
  const registerPlot = async () => {
    if (!selection) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: khasra
            ? `Khasra ${khasra}`
            : sel.village || sel.panchayat || sel.tahsil || 'New plot',
          lat: selection.pin.lat,
          lng: selection.pin.lng,
          locationSource: selection.source,
          accuracyMeters: selection.accuracyMeters ?? undefined,
          boundary: selection.polygon ?? undefined,
          state: sel.state,
          district: sel.district,
          tahsil: sel.tahsil,
          panchayat: sel.panchayat,
          village: sel.village,
          khasraNo: khasra,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Could not register the plot.');
      const farm = json.data as Farm;
      setPlots((prev) => [farm, ...prev]);
      setNotice(
        `Plot registered (${farm.khasraNo ? `khasra ${farm.khasraNo}` : farm.name}) — it is now in the registry and will appear in every matching lookup.`
      );
    } catch (e: any) {
      setRegisterError(e.message ?? 'Could not register the plot.');
    } finally {
      setRegistering(false);
    }
  };

  // Bhuiyan-style khasra report details: farmer copies owner/area/kisam from the
  // official portal; we store them with explicit provenance (never server-verified).
  const openRecForm = (rec?: OfficialRecord) => {
    setRecForm({
      ownerName: rec?.ownerName ?? '',
      areaText: rec?.areaText ?? '',
      areaUnit: rec?.areaUnit ?? 'hectare',
      landType: rec?.landType ?? '',
      coOwners: rec?.coOwners?.join(', ') ?? '',
    });
    setRecError(null);
    setRecOpen(true);
  };

  const saveOfficialRecord = async () => {
    if (!selected) return;
    if (!recForm.ownerName.trim() || !recForm.areaText.trim()) {
      setRecError('Landholder name and area are required — copy them from the khasra report.');
      return;
    }
    setSavingRec(true);
    setRecError(null);
    try {
      const res = await fetch(`/api/fields/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialRecord: {
            ownerName: recForm.ownerName,
            areaText: recForm.areaText,
            areaUnit: recForm.areaUnit,
            landType: recForm.landType,
            coOwners: recForm.coOwners
              ? recForm.coOwners.split(',').map((s) => s.trim()).filter(Boolean)
              : undefined,
            sourcePortal: 'CG Bhuiyan (revenue.cg.nic.in)',
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Could not save the khasra report details.');
      const farm = json.data as Farm;
      setPlots((prev) => prev.map((p) => (p.id === farm.id ? farm : p)));
      setRecOpen(false);
      setNotice('Khasra report details saved to this plot.');
    } catch (e: any) {
      setRecError(e.message ?? 'Could not save the khasra report details.');
    } finally {
      setSavingRec(false);
    }
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setNotice('Geolocation is not available in this browser — type your location instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Nearest registry plot to the GPS fix — honest about what it is.
        let best: Farm | null = null;
        let bestD = Infinity;
        for (const p of plots) {
          const d =
            (p.location.lat - pos.coords.latitude) ** 2 +
            ((p.location.lng - pos.coords.longitude) *
              Math.cos((pos.coords.latitude * Math.PI) / 180)) **
              2;
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
        if (best) {
          setSel({
            state: best.location.state,
            district: best.location.district,
            tahsil: best.location.tahsil,
            panchayat: best.location.panchayat,
            village: best.location.village,
          });
          setKhasra(best.khasraNo ?? '');
          pickPlot(best.id);
          setNotice(
            `Nearest registered plot to your location: ${best.name}. Distance ≈ ${Math.round(
              Math.sqrt(bestD) * 111000
            )} m (straight line).`
          );
        } else {
          setNotice('No registered plots found near your location.');
        }
      },
      () =>
        setNotice(
          'Location permission was not granted. Choose your state/district above instead.'
        )
    );
  };

  const anyLevel = ADMIN_LEVELS.some((l) => sel[l]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" /> Plot Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose your administrative location and khasra number to find a registered plot —
            details and map position load together. Bundled lists cover the reference regions; any level
            accepts typed input. Nothing matches? Place the plot on the map below and register it.
          </p>
        </div>
        <button
          onClick={useCurrentLocation}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <LocateFixed className="w-4 h-4 text-blue-600" /> Nearest plot to me
        </button>
      </div>

      {/* Cascade selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-black text-slate-800">
          <Search className="w-5 h-5 text-emerald-600" /> Find a plot
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADMIN_LEVELS.map((level, i) => (
            <CascadeInput
              key={level}
              level={level}
              sel={sel}
              value={sel[level] ?? ''}
              onChange={(v) => setLevel(level, v)}
              disabled={i > 0 && !sel[ADMIN_LEVELS[i - 1]]}
            />
          ))}
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Khasra / plot no.
            </span>
            <input
              list="khasra-opts"
              value={khasra}
              onChange={(e) => {
                setKhasra(e.target.value);
                setSelectedId(null);
              }}
              placeholder="e.g. 42/1B"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <datalist id="khasra-opts">
              {khasraOptions.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
        </div>

        {/* Live result count */}
        <div className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-800">{matches.length}</span>{' '}
          {matches.length === 1 ? 'plot matches' : 'plots match'}
          {anyLevel && (
            <span className="text-xs bg-slate-100 rounded-lg px-2 py-0.5 font-medium">
              {describeSelection(sel)}
              {khasra && ` · khasra ${khasra}`}
            </span>
          )}
        </div>

        {/* Match chips */}
        {matches.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {matches.slice(0, 12).map((p) => (
              <button
                key={p.id}
                onClick={() => pickPlot(p.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  p.id === selectedId
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.khasraNo ? `Khasra ${p.khasraNo}` : p.name}
                {p.location.village && <span className="text-slate-400"> · {p.location.village}</span>}
              </button>
            ))}
            {matches.length > 12 && (
              <span className="text-xs text-slate-400 self-center">+{matches.length - 12} more</span>
            )}
          </div>
        )}

        {notice && (
          <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-3 py-2">
            {notice}
          </div>
        )}
      </div>

      {/* Map with plot overlays */}
      <FieldMap
        focusPoint={null}
        plots={markers}
        inspectTarget={inspect}
        onPlotClick={pickPlot}
        onSelectionChange={setSelection}
      />

      {/* Details */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Loading plot registry…
        </div>
      )}

      {!loading && selected && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-600" />
                {selected.khasraNo ? `Khasra ${selected.khasraNo}` : selected.name}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{describeSelection(selected.location)}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {selected.recordSource === 'SEEDED' && (
                <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-800 rounded-full px-2 py-0.5 font-black">
                  DEMO DATA
                </span>
              )}
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-bold capitalize">
                {(selected.locationSource ?? 'manual').replace('_', ' ')} ·{' '}
                {selected.recordSource === 'SEEDED' ? 'seeded' : 'registered'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
              Land record
            </div>
            <div className="text-sm text-slate-700">
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Khasra / plot no.</span>
                <span className="font-bold">{selected.khasraNo ?? 'Unknown'}</span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Village</span>
                <span className="font-bold">{selected.location.village ?? 'Unknown'}</span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Tahsil / Panchayat</span>
                <span className="font-bold">
                  {selected.location.tahsil ?? 'Unknown'} / {selected.location.panchayat ?? 'Unknown'}
                </span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">District / State</span>
                <span className="font-bold">
                  {selected.location.district ?? 'Unknown'} / {selected.location.state ?? 'Unknown'}
                </span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Area</span>
                <span className="font-bold flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  {selected.boundary
                    ? `~${selected.boundaryAreaAcres ?? '?'} acres (user-marked boundary)`
                    : `${selected.areaAcres} acres (recorded)`}
                </span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Coordinates</span>
                <span className="font-mono text-xs font-bold">
                  {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
              Crop &amp; field
            </div>
            <div className="text-sm text-slate-700">
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Crop</span>
                <span className="font-bold capitalize">
                  {selected.crop} · {selected.cropStage.replace('_', ' ')}
                </span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Variety</span>
                <span className="font-bold">{selected.cropVariety}</span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Soil / drainage</span>
                <span className="font-bold capitalize">
                  {selected.soilType.replace('_', ' ')} / {selected.drainage}
                </span>
              </div>
              <div className={DETAIL_ROW}>
                <span className="text-slate-500">Water source</span>
                <span className="font-bold">{selected.waterSource}</span>
              </div>
            </div>
          </div>

          {/* Bhuiyan-style khasra report (farmer-entered, provenance explicit) */}
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
              Khasra report (Bhuiyan)
            </div>
            {selected.officialRecord && !recOpen ? (
              <div className="text-sm text-slate-700 space-y-1">
                <div className={DETAIL_ROW}>
                  <span className="text-slate-500">खातेदार / Landholder</span>
                  <span className="font-bold">{selected.officialRecord.ownerName}</span>
                </div>
                <div className={DETAIL_ROW}>
                  <span className="text-slate-500">रकबा / Area</span>
                  <span className="font-bold">
                    {selected.officialRecord.areaText}
                    {selected.officialRecord.areaUnit ? ` ${selected.officialRecord.areaUnit}` : ''}
                  </span>
                </div>
                {selected.officialRecord.landType && (
                  <div className={DETAIL_ROW}>
                    <span className="text-slate-500">किस्म / Land type</span>
                    <span className="font-bold">{selected.officialRecord.landType}</span>
                  </div>
                )}
                {!!selected.officialRecord.coOwners?.length && (
                  <div className={DETAIL_ROW}>
                    <span className="text-slate-500">संयुक्त खातेदार / Co-holders</span>
                    <span className="font-bold">{selected.officialRecord.coOwners.join(', ')}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 pt-1">
                  Farmer-entered from the official khasra report ({selected.officialRecord.sourcePortal ?? 'CG Bhuiyan'},{' '}
                  {new Date(selected.officialRecord.recordedAt).toLocaleDateString()}) — not server-verified.
                  {selected.location.state?.toLowerCase() === 'chhattisgarh' && (
                    <>
                      {' '}Cross-check at{' '}
                      <a
                        href="https://revenue.cg.nic.in/bhuiyanuser/User/Selection_Report_For_KhasraDetail.aspx"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        CG Bhuiyan khasra report ↗
                      </a>{' '}
                      (select जिला → तहसील → ग्राम → खसरा{selected.khasraNo ? ` ${selected.khasraNo}` : ''}).
                    </>
                  )}
                </div>
                <button
                  onClick={() => openRecForm(selected.officialRecord)}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Edit details
                </button>
              </div>
            ) : recOpen ? (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      खातेदार का नाम / Landholder name
                    </span>
                    <input
                      value={recForm.ownerName}
                      onChange={(e) => setRecForm({ ...recForm, ownerName: e.target.value })}
                      className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="Exactly as on the khasra report"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">रकबा / Area</span>
                    <input
                      value={recForm.areaText}
                      onChange={(e) => setRecForm({ ...recForm, areaText: e.target.value })}
                      className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="e.g. 0.410"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Unit</span>
                    <input
                      value={recForm.areaUnit}
                      onChange={(e) => setRecForm({ ...recForm, areaUnit: e.target.value })}
                      className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="hectare / acre"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">किस्म / Land type</span>
                    <input
                      value={recForm.landType}
                      onChange={(e) => setRecForm({ ...recForm, landType: e.target.value })}
                      className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="e.g. तालाब / कृषि भूमि"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Co-holders (comma separated)
                    </span>
                    <input
                      value={recForm.coOwners}
                      onChange={(e) => setRecForm({ ...recForm, coOwners: e.target.value })}
                      className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                      placeholder="Optional"
                    />
                  </label>
                </div>
                {recError && (
                  <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2.5 py-1.5">
                    {recError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveOfficialRecord}
                    disabled={savingRec}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingRec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {savingRec ? 'Saving…' : 'Save khasra report details'}
                  </button>
                  <button onClick={() => setRecOpen(false)} className="text-xs font-bold text-slate-500 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openRecForm(selected.officialRecord)}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                + Add khasra report details (from CG Bhuiyan)
              </button>
            )}
          </div>

          <a
            href={`/field?plot=${selected.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Open in Field Intelligence for weather, soil &amp; evidence
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Empty state: nothing matches — honest explanation + register flow */}
      {!loading && matches.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-sm text-slate-600 space-y-4">
          <div className="flex items-start gap-3">
            <MapIcon className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-slate-800">No plot registered here yet</div>
              {plots.length === 0 ? (
                <p>
                  The registry is empty. Find the field on the map below, tap its location, then
                  register it — it will appear here for every future lookup.
                </p>
              ) : (
                <p>
                  No registered plot matches{' '}<span className="font-bold">
                    {describeSelection(sel)}
                    {khasra && ` · khasra ${khasra}`}
                  </span>
                  . The registry only contains plots registered inside FarmRescue — it does not
                  (yet) verify against the government land-records database.
                </p>
              )}
              <p className="text-xs text-slate-500">
                Name checking: values found in the bundled reference list are marked{' '}<span className="font-semibold text-emerald-600">✓</span>; anything else is kept exactly as you typed — the reference data covers only the pilot regions, so an unmatched name is normal, not an error.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="font-black text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" /> Register this plot
            </div>
            {selection ? (
              <div className="text-xs text-slate-600">
                📍 Pin placed at{' '}<span className="font-mono font-bold">
                  {selection.pin.lat.toFixed(5)}, {selection.pin.lng.toFixed(5)}
                </span>
                {selection.polygon
                  ? ` · boundary drawn (~${selection.areaAcres?.toFixed(2)} acres)`
                  : ' · no boundary yet (optional: “Draw boundary” on the map)'}
                {' '}— tap the map again to adjust.
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Find this plot&apos;s spot on the satellite map below and tap it — then register
                here. The pin&apos;s coordinates are saved with the plot.
              </div>
            )}
            {registerError && (
              <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2.5 py-1.5">
                {registerError}
              </div>
            )}
            <button
              onClick={registerPlot}
              disabled={!selection || registering}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {registering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {registering ? 'Registering…' : 'Register this plot here'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
