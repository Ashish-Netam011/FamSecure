'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  HelpCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { Incident, Farm, RiskLevel } from '@/types';

export default function FieldWorkerQueuePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [farms, setFarms] = useState<Record<string, Farm>>({});
  const [loading, setLoading] = useState(true);

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'NOT_CONFIRMED' | 'NEEDS_MORE_INFORMATION'
  >('CONFIRMED');
  const [verifiedSeverity, setVerifiedSeverity] = useState<RiskLevel>('HIGH');
  const [observation, setObservation] = useState(
    'Inspected Vemuru canal block. Water standing at 18cm. Water flow stagnated by silt and hyacinth.'
  );
  const [notes, setNotes] = useState('Authorized bund breach. Recommended foliar potassium once drained.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [incRes, farmsRes] = await Promise.all([
        fetch('/api/incidents').then((r) => r.json()),
        fetch('/api/farms').then((r) => r.json()),
      ]);

      if (incRes.success) {
        setIncidents(incRes.data);
      }
      if (farmsRes.success) {
        const farmMap: Record<string, Farm> = {};
        farmsRes.data.forEach((f: Farm) => {
          farmMap[f.id] = f;
        });
        setFarms(farmMap);
      }
    } catch (err) {
      console.error('Failed to load field worker queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openVerifyModal = (incident: Incident) => {
    setSelectedIncident(incident);
    setVerifiedSeverity(incident.severity);
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: verificationStatus,
          verifiedSeverity,
          observation,
          notes,
          workerName: 'Ramesh Kumar (Agri Extension Officer)',
        }),
      });

      if (res.ok) {
        setVerifyModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error('Verification error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Activity className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading field inspection queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block">
              Operational Portal
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Field Worker View
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Field Worker & FPO Inspection Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-800">Ramesh Kumar (Agricultural Extension Officer)</strong> • Vemuru Cluster
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-medium">
            Pending Inspections: <strong>{incidents.filter((i) => !i.verification && i.status !== 'RESOLVED').length}</strong>
          </span>
        </div>
      </div>

      {/* Philosophy Banner (TRD Section 4.4 Human-in-the-Loop) */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 text-xs">
        <UserCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block mb-0.5">
            Human-in-the-Loop Verification Protocol
          </span>
          <p className="text-slate-300 leading-relaxed">
            When the Risk Engine detects high-consequence threats or missing local context, it triggers
            an escalation to field personnel. Agricultural officers verify ground observations before
            farmers take costly structural or biological actions.
          </p>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((incident) => {
          const farm = farms[incident.farmId];
          const isVerified = !!incident.verification;

          return (
            <div
              key={incident.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      incident.severity === 'CRITICAL'
                        ? 'bg-red-600 text-white animate-pulse'
                        : incident.severity === 'HIGH'
                        ? 'bg-amber-500 text-white'
                        : 'bg-yellow-400 text-slate-900'
                    }`}
                  >
                    {incident.severity}
                  </span>
                  <h3 className="font-bold text-base text-slate-900">{incident.title}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    3.8 km away • {farm?.location.village}
                  </span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    Status: {incident.status}
                  </span>
                </div>
              </div>

              {/* Farmer Profile row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Farmer</span>
                  <span className="font-bold text-slate-800">{farm?.ownerName}</span>
                  <div className="text-[10px] text-slate-500">{farm?.ownerPhone}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Crop & Area</span>
                  <span className="font-bold text-slate-800 uppercase">{farm?.crop}</span>
                  <div className="text-[10px] text-slate-500">{farm?.areaAcres} acres • {farm?.cropVariety}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Crop Stage</span>
                  <span className="font-bold text-amber-700 capitalize">{farm?.cropStage.replace('_', ' ')}</span>
                  <div className="text-[10px] text-slate-500">Susceptible to submergence</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Verification</span>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {incident.verification?.status}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Visit
                    </span>
                  )}
                </div>
              </div>

              {/* Farmer description */}
              <p className="text-xs text-slate-600 italic">
                &quot;{incident.description}&quot;
              </p>

              {/* Verified observations callout if already verified */}
              {incident.verification && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    Verified by {incident.verification.workerName}:
                  </div>
                  <p className="text-emerald-800">{incident.verification.observation}</p>
                  <p className="text-[11px] text-emerald-700"><strong>Notes:</strong> {incident.verification.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <Link
                  href={`/incidents/${incident.id}`}
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Inspect Full Evidence & Actions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => openVerifyModal(incident)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isVerified ? 'Update Verification' : 'Verify Incident on Ground'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VERIFICATION MODAL */}
      {verifyModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Field Verification Form
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedIncident.title} • {farms[selectedIncident.farmId]?.ownerName}
                </p>
              </div>
              <button onClick={() => setVerifyModalOpen(false)}>
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Inspection Outcome Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CONFIRMED', label: 'Confirmed Condition' },
                    { id: 'PARTIALLY_CONFIRMED', label: 'Partially Confirmed' },
                    { id: 'NOT_CONFIRMED', label: 'Not Confirmed / False Alarm' },
                    { id: 'NEEDS_MORE_INFORMATION', label: 'Needs More Evidence' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setVerificationStatus(s.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                        verificationStatus === s.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Verified Severity Rating
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NORMAL', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVerifiedSeverity(r)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                        verifiedSeverity === r
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ground Truth Observation & Crop Stage Assessment
                </label>
                <textarea
                  rows={2}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  placeholder="e.g. Silt accumulation in south drainage trench confirmed; water depth 18cm."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Field Worker Instructions & Agronomic Recommendations
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  placeholder="e.g. Community canal clearing arranged for tomorrow 9 AM."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording...' : 'Submit Ground Verification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
