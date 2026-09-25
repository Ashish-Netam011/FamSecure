'use client';

import React, { useState } from 'react';
import {
  Sliders,
  CloudRain,
  Clock,
  Waves,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  X,
  CheckCircle2,
} from 'lucide-react';
import { DrainageType, CropStage } from '@/types';

interface SimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  onReassessed?: () => void;
}

export default function SimulationDrawer({
  isOpen,
  onClose,
  incidentId,
  onReassessed,
}: SimulationDrawerProps) {
  const [rainfall24h, setRainfall24h] = useState<number>(82);
  const [standingWaterHours, setStandingWaterHours] = useState<number>(24);
  const [standingWaterDepthCm, setStandingWaterDepthCm] = useState<number>(18);
  const [drainage, setDrainage] = useState<DrainageType>('poor');
  const [cropStage, setCropStage] = useState<CropStage>('tillering');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: {
    rain: number;
    hours: number;
    depth: number;
    drain: DrainageType;
    stage: CropStage;
  }) => {
    setRainfall24h(preset.rain);
    setStandingWaterHours(preset.hours);
    setStandingWaterDepthCm(preset.depth);
    setDrainage(preset.drain);
    setCropStage(preset.stage);
  };

  const handleRunSimulation = async () => {
    setIsSubmitting(true);
    setSimResult(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/reassess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simParams: {
            rainfall24h,
            standingWaterHours,
            standingWaterDepthCm,
            drainage,
            cropStage,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimResult(
          `Reassessed: Severity is now ${data.data.severity} (Rule: ${data.data.currentAssessment.ruleVersion})`
        );
        if (onReassessed) onReassessed();
      } else {
        setSimResult('Error applying simulation.');
      }
    } catch {
      setSimResult('Failed to connect to simulation engine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDemo = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/simulation/reset', { method: 'POST' });
      setRainfall24h(82);
      setStandingWaterHours(24);
      setStandingWaterDepthCm(18);
      setDrainage('poor');
      setCropStage('tillering');
      setSimResult('Baseline farm and incident conditions restored.');
      if (onReassessed) onReassessed();
    } catch {
      setSimResult('Reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-amber-200">
        {/* Header with increased text sizes */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-800/40 text-amber-200">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-wide flex items-center gap-2">
                Scenario Testing Lab
                <span className="text-xs bg-amber-900/80 text-amber-200 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold">
                  Interactive
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 font-medium">
                Test deterministic risk engine across changing conditions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-4 text-sm text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">ENVIRONMENTAL STRESS SIMULATION:</span> Adjust
            rainfall and drainage below to observe how the deterministic rules and Safety
            Gate recalculate risk and generate new action plans in real time.
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 text-sm">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 block">
              Quick Test Scenarios
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() =>
                  handleApplyPreset({
                    rain: 115,
                    hours: 48,
                    depth: 25,
                    drain: 'poor',
                    stage: 'tillering',
                  })
                }
                className="p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-950 text-left transition-colors"
              >
                <div className="font-bold text-sm">⛈️ Severe Flood</div>
                <div className="text-xs text-red-700 font-medium mt-0.5">115mm, 48h → Critical</div>
              </button>

              <button
                onClick={() =>
                  handleApplyPreset({
                    rain: 82,
                    hours: 24,
                    depth: 18,
                    drain: 'poor',
                    stage: 'tillering',
                  })
                }
                className="p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-950 text-left transition-colors"
              >
                <div className="font-bold text-sm">🌧️ Heavy Waterlog</div>
                <div className="text-xs text-amber-700 font-medium mt-0.5">82mm, 24h → High</div>
              </button>

              <button
                onClick={() =>
                  handleApplyPreset({
                    rain: 35,
                    hours: 8,
                    depth: 8,
                    drain: 'moderate',
                    stage: 'vegetative',
                  })
                }
                className="p-3 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-950 text-left transition-colors"
              >
                <div className="font-bold text-sm">🌦️ Moderate Pool</div>
                <div className="text-xs text-yellow-700 font-medium mt-0.5">35mm, 8h → Moderate</div>
              </button>

              <button
                onClick={() =>
                  handleApplyPreset({
                    rain: 5,
                    hours: 0,
                    depth: 2,
                    drain: 'good',
                    stage: 'vegetative',
                  })
                }
                className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-left transition-colors"
              >
                <div className="font-bold text-sm">☀️ Drained / Normal</div>
                <div className="text-xs text-emerald-700 font-medium mt-0.5">5mm, 0h → Normal</div>
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-5">
            {/* Rainfall */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <span className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <CloudRain className="w-5 h-5 text-blue-600" /> 24h Rainfall
                </span>
                <span className="font-black text-blue-700 font-mono text-lg">
                  {rainfall24h} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="140"
                step="5"
                value={rainfall24h}
                onChange={(e) => setRainfall24h(Number(e.target.value))}
                className="w-full h-2.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-mono">
                <span>0 mm</span>
                <span>40 mm (Alert)</span>
                <span>140 mm</span>
              </div>
            </div>

            {/* Standing Water Hours */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <span className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Clock className="w-5 h-5 text-amber-600" /> Standing Water Duration
                </span>
                <span className="font-black text-amber-700 font-mono text-lg">
                  {standingWaterHours} hours
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="72"
                step="2"
                value={standingWaterHours}
                onChange={(e) => setStandingWaterHours(Number(e.target.value))}
                className="w-full h-2.5 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-mono">
                <span>0 h</span>
                <span>24 h (Damage threshold)</span>
                <span>72 h</span>
              </div>
            </div>

            {/* Water Depth */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <span className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Waves className="w-5 h-5 text-cyan-600" /> Standing Water Depth
                </span>
                <span className="font-black text-cyan-700 font-mono text-lg">
                  {standingWaterDepthCm} cm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="1"
                value={standingWaterDepthCm}
                onChange={(e) => setStandingWaterDepthCm(Number(e.target.value))}
                className="w-full h-2.5 bg-cyan-100 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-mono">
                <span>0 cm (dry)</span>
                <span>15 cm (submergence)</span>
                <span>35 cm</span>
              </div>
            </div>

            {/* Soil Drainage */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">
                Field Drainage Condition
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['poor', 'moderate', 'good'] as DrainageType[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDrainage(d)}
                    className={`py-3 px-3 rounded-xl border text-sm font-bold capitalize transition-all ${
                      drainage === d
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Stage */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">
                Paddy Crop Stage
              </label>
              <select
                value={cropStage}
                onChange={(e) => setCropStage(e.target.value as CropStage)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="seedling">Seedling (Vulnerable)</option>
                <option value="tillering">Tillering (High Root Growth)</option>
                <option value="vegetative">Vegetative</option>
                <option value="panicle_initiation">Panicle Initiation (Sensitive)</option>
                <option value="flowering">Flowering (Critical)</option>
                <option value="ripening">Ripening</option>
              </select>
            </div>
          </div>

          {/* Feedback banner */}
          {simResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{simResult}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-2.5 sticky bottom-0">
          <button
            onClick={handleRunSimulation}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>Apply & Reassess Incident</span>
          </button>
          <button
            onClick={handleResetDemo}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Initial Demo State</span>
          </button>
        </div>
      </div>
    </div>
  );
}
