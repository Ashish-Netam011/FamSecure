'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CloudRain,
  Waves,
  Thermometer,
  Bug,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { IncidentType } from '@/types';

export default function NewIncidentPage() {
  const router = useRouter();

  // Wizard steps: 1: Type, 2: Symptoms & Details, 3: Evidence Confirmation, 4: Assessing
  const [step, setStep] = useState<number>(1);

  const [incidentType, setIncidentType] = useState<IncidentType>('waterlogging');
  const [description, setDescription] = useState<string>(
    'Heavy rain has submerged our paddy bunds. Water is standing deep and cannot drain out into the village canal.'
  );
  const [standingWaterHours, setStandingWaterHours] = useState<number>(24);
  const [standingWaterDepthCm, setStandingWaterDepthCm] = useState<number>(18);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Water standing > 15 cm',
    'Bunds overflowing',
  ]);
  const [photoAdded, setPhotoAdded] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const incidentTypes = [
    {
      id: 'waterlogging',
      label: 'Waterlogging',
      icon: Waves,
      desc: 'Standing water submerged in field',
      color: 'border-blue-500 bg-blue-50/50 text-blue-900',
    },
    {
      id: 'heavy_rain',
      label: 'Heavy Rain Alert',
      icon: CloudRain,
      desc: 'Continuous torrential downpour',
      color: 'border-indigo-500 bg-indigo-50/50 text-indigo-900',
    },
    {
      id: 'heat_stress',
      label: 'Heat Stress',
      icon: Thermometer,
      desc: 'Extreme dry temperature & wilting',
      color: 'border-amber-500 bg-amber-50/50 text-amber-900',
    },
    {
      id: 'pest',
      label: 'Pest Infestation',
      icon: Bug,
      desc: 'Insects or larvae attacking crop',
      color: 'border-orange-500 bg-orange-50/50 text-orange-900',
    },
    {
      id: 'disease',
      label: 'Crop Disease',
      icon: AlertCircle,
      desc: 'Spots, leaf blast, or sheath rot',
      color: 'border-purple-500 bg-purple-50/50 text-purple-900',
    },
    {
      id: 'other',
      label: 'Something Else',
      icon: HelpCircle,
      desc: 'Unusual symptom or unknown issue',
      color: 'border-slate-500 bg-slate-50/50 text-slate-900',
    },
  ];

  const symptomChips = [
    'Water standing > 15 cm',
    'Bunds overflowing',
    'Growing tips fully submerged',
    'Leaves turning yellow / pale',
    'Muddy water covering tillers',
    'Plants falling over (lodging)',
    'Canal gate blocked with debris',
  ];

  const toggleSymptom = (chip: string) => {
    if (selectedSymptoms.includes(chip)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== chip));
    } else {
      setSelectedSymptoms([...selectedSymptoms, chip]);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setStep(4); // Show the assessment transition screen

    try {
      const fullDescription = `${description}. Observed symptoms: ${selectedSymptoms.join(', ')}.`;

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: 'farm-001',
          type: incidentType,
          description: fullDescription,
          standingWaterHours,
          standingWaterDepthCm,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.id) {
        // Short pause to simulate deterministic assessment validation
        setTimeout(() => {
          router.push(`/incidents/${data.data.id}`);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to create incident', err);
      setIsSubmitting(false);
      setStep(3);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb / Step Indicator */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest block">
            Emergency Reporting Flow
          </span>
          <h1 className="text-xl font-black text-slate-900">Report a Farm Problem</h1>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Step {Math.min(step, 3)} of 3
        </div>
      </div>

      {/* STEP 1: What happened? */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">What happened on your farm?</h2>
            <p className="text-xs text-slate-500">
              Select the primary condition. You do not need to know the exact scientific diagnosis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = incidentType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setIncidentType(type.id as IncidentType)}
                  className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                    isSelected
                      ? `${type.color} ring-2 ring-emerald-500/20 shadow-md`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{type.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-transform hover:scale-105"
            >
              <span>Next: Describe What You See</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Symptoms & Evidence Details */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">What are you seeing in the field?</h2>
            <p className="text-xs text-slate-500">
              Provide ground truth observations to help calibrate the Risk Engine.
            </p>
          </div>

          {/* Quick Symptoms Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Select Symptoms Present (Tap all that apply):
            </label>
            <div className="flex flex-wrap gap-2">
              {symptomChips.map((chip) => {
                const active = selectedSymptoms.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleSymptom(chip)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Water Measurement Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="flex items-center gap-1 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Standing Duration
                </span>
                <span className="font-bold text-amber-800 font-mono">
                  ~{standingWaterHours} hours
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="72"
                step="1"
                value={standingWaterHours}
                onChange={(e) => setStandingWaterHours(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Just started</span>
                <span>24h (danger)</span>
                <span>72h</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="flex items-center gap-1 text-slate-700">
                  <Waves className="w-3.5 h-3.5 text-blue-600" /> Water Depth
                </span>
                <span className="font-bold text-blue-800 font-mono">
                  ~{standingWaterDepthCm} cm
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={standingWaterDepthCm}
                onChange={(e) => setStandingWaterDepthCm(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Shallow (5cm)</span>
                <span>Submerged (15cm)</span>
                <span>Deep (40cm)</span>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Describe in your own words:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Lowest corner of the field is submerged under 18cm of rainwater. Embankments cannot drain fast enough."
            />
          </div>

          {/* Photo Evidence Preview */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                Crop Photo Evidence attached:
              </span>
              <span className="text-slate-500">Paddy_Field_Submergence.jpg</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
              Ready
            </span>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-transform hover:scale-105"
            >
              <span>Review & Confirm Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Evidence Confirmation (Section 15 App Flow) */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pre-Assessment Verification
            </div>
            <h2 className="text-base font-bold text-slate-900">Let&apos;s check what we know</h2>
            <p className="text-xs text-slate-500">
              Confirm this information before FarmRescue runs the deterministic Risk Engine and Safety Gate.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm text-xs">
            <div className="p-4 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Crop & Field</span>
                <span className="font-bold text-slate-800 text-sm">Paddy (Tillering Stage)</span>
                <p className="text-slate-500">Vemuru Riverbed Field • Clay Loam</p>
              </div>
              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-medium">
                Farm Profile
              </span>
            </div>

            <div className="p-4 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Reported Condition</span>
                <span className="font-bold text-slate-800 capitalize text-sm">{incidentType.replace('_', ' ')}</span>
                <p className="text-slate-500">{selectedSymptoms.join(' • ')}</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded text-[11px]">
                Reported
              </span>
            </div>

            <div className="p-4 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Field Standing Water</span>
                <span className="font-bold text-slate-800 text-sm">~{standingWaterDepthCm} cm depth for ~{standingWaterHours} hours</span>
                <p className="text-slate-500">Drainage channels overflowing</p>
              </div>
              <span className="bg-amber-50 text-amber-800 font-bold px-2 py-1 rounded text-[11px]">
                Ground Evidence
              </span>
            </div>

            <div className="p-4 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Weather Adapter Sync</span>
                <span className="font-bold text-slate-800 text-sm">Open-Meteo Precipitation Log</span>
                <p className="text-slate-500">82 mm / 24h recorded • Additional rain forecast</p>
              </div>
              <span className="bg-blue-50 text-blue-800 font-bold px-2 py-1 rounded text-[11px]">
                Live Provider
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit Information</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-transform hover:scale-105 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Looks Correct — Run Risk Engine & Assess</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Processing State (Section 16 App Flow) */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
            <Activity className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">
              Evaluating Farm Emergency Evidence
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Executing deterministic agronomic rules and Safety Gate validation...
            </p>
          </div>

          <div className="max-w-sm mx-auto text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Farm coordinates & soil profile verified</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Recent 24h precipitation & forecast ingested</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Paddy submergence threshold evaluated</span>
            </div>
            <div className="flex items-center gap-2 text-amber-700 font-semibold animate-pulse">
              <Activity className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Safety Gate checking action permissibility...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
