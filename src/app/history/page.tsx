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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Activity className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading audit history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
            Auditable Records
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Incident History & Agronomic Outcomes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Non-destructive audit log preserving all risk assessments, action plans, and farmer outcomes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'high_risk', label: 'High Risk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            No incidents found matching this filter.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const farm = farms[incident.farmId];
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
                    <h3 className="font-bold text-base text-slate-900">{incident.title}</h3>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      incident.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {incident.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Reported By</span>
                    <span className="font-semibold text-slate-800">{farm?.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Crop</span>
                    <span className="font-semibold text-slate-800 capitalize">{farm?.crop} ({farm?.cropStage})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Assessments Logged</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {incident.assessmentsHistory?.length || 1} versions
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Verification</span>
                    <span className="font-semibold text-slate-800">
                      {incident.verification ? incident.verification.status : 'None'}
                    </span>
                  </div>
                </div>

                {/* Outcome card if resolved */}
                {incident.outcome && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Recorded Outcome: Situation Improved ({incident.outcome.situationImproved})
                    </div>
                    <p className="text-emerald-800">
                      <strong>Crop Condition:</strong> {incident.outcome.cropCondition}
                    </p>
                    <p className="text-slate-600 italic">
                      &quot;{incident.outcome.farmerFeedback}&quot;
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">
                    ID: <code className="font-mono text-[11px]">{incident.id}</code>
                  </span>

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View Emergency Response Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
