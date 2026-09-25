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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Activity className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-base font-semibold text-slate-600">Loading field inspection queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-emerald-700 uppercase tracking-widest block">
              Operational Portal
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Field Worker View
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Field Worker & Extension Queue
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Logged in as <strong className="text-slate-900">Ramesh Kumar (Agricultural Extension Officer)</strong> • Vemuru Cluster
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm bg-slate-100 text-slate-800 px-4 py-2 rounded-2xl font-bold shadow-xs">
            Pending Inspections: <strong className="text-emerald-700">{incidents.filter((i) => !i.verification && i.status !== 'RESOLVED').length}</strong>
          </span>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 text-sm shadow-md">
        <UserCheck className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-black text-base text-amber-300 block">
            Human-in-the-Loop Verification Protocol
          </span>
          <p className="text-slate-300 leading-relaxed font-normal">
            When the Risk Engine detects high-consequence threats or missing local context, it triggers
            an escalation to field personnel. Agricultural extension officers verify ground observations before
            farmers take costly structural or biological actions.
          </p>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-6">
        {incidents.map((incident) => {
          const farm = farms[incident.farmId];
          const isVerified = !!incident.verification;

          return (
            <div
              key={incident.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span
                    className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-full font-black uppercase ${
                      incident.severity === 'CRITICAL'
                        ? 'bg-red-600 text-white animate-pulse'
                        : incident.severity === 'HIGH'
                        ? 'bg-amber-500 text-white'
                        : 'bg-yellow-400 text-slate-900'
                    }`}
                  >
                    {incident.severity}
                  </span>
                  <h3 className="font-black text-lg sm:text-xl text-slate-900">{incident.title}</h3>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    3.8 km away • {farm?.location.village}
                  </span>
                  <span className="font-mono bg-slate-100 px-3 py-1 rounded-md text-xs font-semibold">
                    Status: {incident.status}
                  </span>
                </div>
              </div>

              {/* Farmer Profile row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs block uppercase font-bold">Farmer</span>
                  <span className="font-extrabold text-slate-900 text-base">{farm?.ownerName}</span>
                  <div className="text-xs text-slate-500 font-medium">{farm?.ownerPhone}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block uppercase font-bold">Crop & Area</span>
                  <span className="font-extrabold text-slate-900 text-base uppercase">{farm?.crop}</span>
                  <div className="text-xs text-slate-500 font-medium">{farm?.areaAcres} acres • {farm?.cropVariety}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block uppercase font-bold">Crop Stage</span>
                  <span className="font-bold text-amber-700 text-base capitalize">{farm?.cropStage.replace('_', ' ')}</span>
                  <div className="text-xs text-slate-500 font-medium">Susceptible to submergence</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block uppercase font-bold">Verification</span>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black text-base">
                      <CheckCircle2 className="w-4 h-4" />
                      {incident.verification?.status}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1.5 text-base">
                      <Clock className="w-4 h-4" />
                      Pending Visit
                    </span>
                  )}
                </div>
              </div>

              {/* Farmer description */}
              <p className="text-base text-slate-700 italic font-medium">
                &quot;{incident.description}&quot;
              </p>

              {/* Verified observations callout if already verified */}
              {incident.verification && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm text-emerald-950 space-y-1.5">
                  <div className="font-black text-base flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                    Verified by {incident.verification.workerName}:
                  </div>
                  <p className="text-slate-800 font-medium">{incident.verification.observation}</p>
                  <p className="text-xs sm:text-sm text-emerald-900 font-semibold">
                    <strong>Extension Notes:</strong> {incident.verification.notes}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-sm">
                <Link
                  href={`/incidents/${incident.id}`}
                  className="text-emerald-700 font-black hover:underline flex items-center gap-1.5"
                >
                  <span>Inspect Full Evidence & Actions</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => openVerifyModal(incident)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isVerified ? 'Update Ground Verification' : 'Verify Incident on Ground'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VERIFICATION MODAL */}
      {verifyModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  Field Verification Form
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedIncident.title} • {farms[selectedIncident.farmId]?.ownerName}
                </p>
              </div>
              <button onClick={() => setVerifyModalOpen(false)}>
                <XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5 text-sm">
              <div>
                <label className="font-extrabold text-slate-800 block mb-2">
                  Inspection Outcome Status
                </label>
                <div className="grid grid-cols-2 gap-2.5">
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
                      className={`p-3 rounded-2xl border text-left font-bold transition-all ${
                        verificationStatus === s.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/25'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-2">
                  Verified Severity Rating
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NORMAL', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVerifiedSeverity(r)}
                      className={`py-2.5 px-2 rounded-xl border text-center font-black text-sm transition-all ${
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
                <label className="font-bold text-slate-800 block mb-1.5">
                  Ground Truth Observation & Crop Stage Assessment
                </label>
                <textarea
                  rows={2}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium"
                  placeholder="e.g. Silt accumulation in south drainage trench confirmed; water depth 18cm."
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Extension Officer Instructions & Agronomic Recommendations
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium"
                  placeholder="e.g. Community canal clearing arranged for tomorrow 9 AM."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2"
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
