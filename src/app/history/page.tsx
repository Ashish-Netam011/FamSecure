'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  ShieldAlert,
  Activity,
  UserCheck,
} from 'lucide-react';
import { Incident, Farm } from '@/types';

export default function HistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [farms, setFarms] = useState<Record<string, Farm>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'high_risk'>('all');

  const loadData = async () => {
    try {
      const [incRes, farmsRes] = await Promise.all([
        fetch('/api/incidents').then((r) => r.json()),
        fetch('/api/farms').then((r) => r.json()),
      ]);

      if (incRes.success) setIncidents(incRes.data);
      if (farmsRes.success) {
        const farmMap: Record<string, Farm> = {};
        farmsRes.data.forEach((f: Farm) => {
          farmMap[f.id] = f;
        });
        setFarms(farmMap);
      }
    } catch (err) {
      console.error('History load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'active') return i.status !== 'RESOLVED';
    if (filter === 'resolved') return i.status === 'RESOLVED';
    if (filter === 'high_risk') return i.severity === 'HIGH' || i.severity === 'CRITICAL';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Activity className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-base font-semibold text-slate-600">Loading audit history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest block">
            Auditable Records
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Incident History & Agronomic Outcomes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Non-destructive audit log preserving all risk assessments, action plans, and farmer outcomes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-sm font-bold">
          <Filter className="w-4 h-4 text-slate-500 ml-2" />
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'high_risk', label: 'High Risk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="space-y-5">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-sm sm:text-base text-slate-500 font-medium">
            No incidents found matching this filter.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const farm = farms[incident.farmId];
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
                          ? 'bg-red-600 text-white'
                          : incident.severity === 'HIGH'
                          ? 'bg-amber-500 text-white'
                          : incident.severity === 'MODERATE'
                          ? 'bg-yellow-400 text-slate-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {incident.severity}
                    </span>
                    <h3 className="font-black text-lg sm:text-xl text-slate-900">{incident.title}</h3>
                  </div>

                  <span
                    className={`text-xs sm:text-sm font-black px-3.5 py-1 rounded-full ${
                      incident.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {incident.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 text-xs block uppercase font-bold">Reported By</span>
                    <span className="font-extrabold text-slate-900 text-base">{farm?.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block uppercase font-bold">Crop</span>
                    <span className="font-extrabold text-slate-900 text-base capitalize">{farm?.crop} ({farm?.cropStage})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block uppercase font-bold">Assessments Logged</span>
                    <span className="font-extrabold text-slate-900 text-base font-mono">
                      {incident.assessmentsHistory?.length || 1} versions
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block uppercase font-bold">Verification</span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {incident.verification ? incident.verification.status : 'None'}
                    </span>
                  </div>
                </div>

                {/* Outcome card if resolved */}
                {incident.outcome && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm text-emerald-950 space-y-1.5">
                    <div className="font-black text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      Recorded Outcome: Situation Improved ({incident.outcome.situationImproved})
                    </div>
                    <p className="text-slate-800 font-medium">
                      <strong>Crop Condition:</strong> {incident.outcome.cropCondition}
                    </p>
                    <p className="text-slate-600 italic">
                      &quot;{incident.outcome.farmerFeedback}&quot;
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-400 font-mono text-xs">
                    ID: <code>{incident.id}</code>
                  </span>

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="text-emerald-700 font-black hover:underline flex items-center gap-1.5"
                  >
                    <span>View Emergency Response Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
