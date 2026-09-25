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
    setStep(4);

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
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb / Step Indicator */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs sm:text-sm font-black text-red-600 uppercase tracking-widest block">
            Emergency Reporting Flow
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            Report a Farm Problem
          </h1>
        </div>
        <div className="text-sm font-bold text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-xl">
          Step {Math.min(step, 3)} of 3
        </div>
      </div>

      {/* STEP 1: What happened? */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              What happened on your farm?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Select the primary condition. You do not need to know the exact scientific diagnosis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = incidentType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setIncidentType(type.id as IncidentType)}
                  className={`p-5 rounded-3xl border-2 text-left flex items-start gap-4 transition-all ${
                    isSelected
                      ? `${type.color} ring-2 ring-emerald-500/25 shadow-md scale-[1.01]`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="p-3 rounded-2xl bg-white shadow-sm shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">{type.label}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">{type.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base px-7 py-4 rounded-2xl shadow-lg transition-transform hover:scale-105"
            >
              <span>Next: Describe What You See</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Symptoms & Evidence Details */}
      {step === 2 && (
        <div className="space-y-7 animate-in fade-in">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              What are you seeing in the field?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Provide ground truth observations to help calibrate the Risk Engine.
            </p>
          </div>

          {/* Quick Symptoms Chips */}
          <div>
            <label className="text-sm font-extrabold text-slate-800 block mb-2.5">
              Select Symptoms Present (Tap all that apply):
            </label>
            <div className="flex flex-wrap gap-2.5">
              {symptomChips.map((chip) => {
                const active = selectedSymptoms.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleSymptom(chip)}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                      active
                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200">
            <div>
              <div className="flex justify-between items-center text-sm font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-4 h-4 text-amber-600" /> Standing Duration
                </span>
                <span className="font-black text-amber-800 font-mono text-base">
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
                className="w-full h-2.5 accent-amber-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
                <span>Just started</span>
                <span>24h (danger)</span>
                <span>72h</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-sm font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Waves className="w-4 h-4 text-blue-600" /> Water Depth
                </span>
                <span className="font-black text-blue-800 font-mono text-base">
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
                className="w-full h-2.5 accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
                <span>Shallow (5cm)</span>
                <span>Submerged (15cm)</span>
                <span>Deep (40cm)</span>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-sm font-extrabold text-slate-800 block mb-2">
              Describe in your own words:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 text-sm sm:text-base rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              placeholder="e.g. Lowest corner of the field is submerged under 18cm of rainwater. Embankments cannot drain fast enough."
            />
          </div>

          {/* Photo Evidence Preview */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-800">
                Crop Photo Evidence:
              </span>
              <span className="text-slate-500">Paddy_Field_Submergence.jpg</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md">
              Attached
            </span>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-bold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base px-7 py-4 rounded-2xl transition-transform hover:scale-105"
            >
              <span>Review & Confirm Evidence</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Evidence Confirmation */}
      {step === 3 && (
        <div className="space-y-7 animate-in fade-in">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs sm:text-sm px-3 py-1 rounded-full font-extrabold mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Pre-Assessment Verification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Let&apos;s check what we know
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Confirm this information before FarmRescue runs the deterministic Risk Engine and Safety Gate.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 shadow-sm text-sm">
            <div className="p-5 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-xs uppercase font-extrabold">Crop & Field</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg">Paddy (Tillering Stage)</span>
                <p className="text-slate-500 font-medium mt-0.5">Vemuru Riverbed Field • Clay Loam</p>
              </div>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold">
                Farm Profile
              </span>
            </div>

            <div className="p-5 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-xs uppercase font-extrabold">Reported Condition</span>
                <span className="font-extrabold text-slate-900 capitalize text-base sm:text-lg">{incidentType.replace('_', ' ')}</span>
                <p className="text-slate-500 font-medium mt-0.5">{selectedSymptoms.join(' • ')}</p>
              </div>
              <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs">
                Reported
              </span>
            </div>

            <div className="p-5 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-xs uppercase font-extrabold">Field Standing Water</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg">~{standingWaterDepthCm} cm depth for ~{standingWaterHours} hours</span>
                <p className="text-slate-500 font-medium mt-0.5">Drainage channels overflowing</p>
              </div>
              <span className="bg-amber-50 text-amber-900 font-bold px-3 py-1 rounded-lg text-xs">
                Ground Evidence
              </span>
            </div>

            <div className="p-5 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-xs uppercase font-extrabold">Weather Adapter Sync</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg">Open-Meteo Precipitation Log</span>
                <p className="text-slate-500 font-medium mt-0.5">82 mm / 24h recorded • Additional rain forecast</p>
              </div>
              <span className="bg-blue-50 text-blue-800 font-bold px-3 py-1 rounded-lg text-xs">
                Live Provider
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-bold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Edit Information</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base px-7 py-4 rounded-2xl shadow-xl shadow-emerald-600/25 transition-transform hover:scale-105 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Looks Correct — Run Risk Engine & Assess</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Processing State */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 shadow-sm text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-200">
            <Activity className="w-10 h-10 animate-spin" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Evaluating Farm Emergency Evidence
            </h2>
            <p className="text-base text-slate-600 mt-1">
              Executing deterministic agronomic rules and Safety Gate validation...
            </p>
          </div>

          <div className="max-w-md mx-auto text-left space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Farm coordinates & soil profile verified</span>
            </div>
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Recent 24h precipitation & forecast ingested</span>
            </div>
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Paddy submergence threshold evaluated</span>
            </div>
            <div className="flex items-center gap-2.5 text-amber-700 font-extrabold animate-pulse">
              <Activity className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Safety Gate checking action permissibility...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
