'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  UserCheck,
  Check,
  XCircle,
  HelpCircle,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { Incident, Farm, ExplanationResponse } from '@/types';
import { getFreshnessState } from '@/domain/evidence/freshness';

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params?.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showRuleDetails, setShowRuleDetails] = useState(false);

  // Add Update Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateType, setUpdateType] = useState('standing_water_depth');
  const [updateValue, setUpdateValue] = useState<number>(6);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Outcome / Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [situationImproved, setSituationImproved] = useState<'yes' | 'partially' | 'no'>('yes');
  const [cropCondition, setCropCondition] = useState('Healthy green tillers, no lodging');
  const [farmerFeedback, setFarmerFeedback] = useState('Breaching the bund cleared 12cm of water within 14 hours. Saved the seedlings!');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const fetchIncidentData = useCallback(async () => {
    if (!incidentId) return;
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      const data = await res.json();
      if (data.success) {
        setIncident(data.data.incident);
        setFarm(data.data.farm);
      }
    } catch (err) {
      console.error('Failed to load incident detail', err);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  const fetchAiExplanation = useCallback(async () => {
    if (!incidentId) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/explain`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setExplanation(data.data);
      }
    } catch (err) {
      console.error('AI explanation failed', err);
    } finally {
      setLoadingAi(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchIncidentData();

    const handleReassessEvent = () => {
      fetchIncidentData();
      fetchAiExplanation();
    };
    window.addEventListener('farmrescue:reassessed', handleReassessEvent);
    return () => {
      window.removeEventListener('farmrescue:reassessed', handleReassessEvent);
    };
  }, [fetchIncidentData, fetchAiExplanation]);

  useEffect(() => {
    if (incident && !explanation) {
      fetchAiExplanation();
    }
  }, [incident, explanation, fetchAiExplanation]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUpdate(true);
    try {
      const unit = updateType.includes('depth') ? 'cm' : 'hours';
      await fetch(`/api/incidents/${incidentId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: updateType,
          value: Number(updateValue),
          unit,
          source: 'farmer_observation',
          strength: 'MODERATE',
        }),
      });

      setUpdateModalOpen(false);
      await fetchIncidentData();
      await fetchAiExplanation();
    } catch (err) {
      console.error('Error submitting update', err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingResolve(true);
    try {
      await fetch(`/api/incidents/${incidentId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situationImproved,
          actionsHelpful: 'yes',
          observedDamage: 'Minimal leaf discoloration',
          cropCondition,
          farmerFeedback,
        }),
      });

      setResolveModalOpen(false);
      await fetchIncidentData();
    } catch (err) {
      console.error('Error resolving incident', err);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  if (loading || !incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Activity className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading emergency action plan...</p>
      </div>
    );
  }

  const assessment = incident.currentAssessment;
  const actionPlan = incident.currentActionPlan;

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          banner: 'from-red-600 to-rose-700 text-white',
          badge: 'bg-red-800 text-white',
          accent: 'text-red-700',
        };
      case 'HIGH':
        return {
          banner: 'from-amber-600 to-amber-700 text-white',
          badge: 'bg-amber-900 text-amber-100',
          accent: 'text-amber-800',
        };
      case 'MODERATE':
        return {
          banner: 'from-yellow-500 to-amber-500 text-slate-900',
          badge: 'bg-yellow-800 text-yellow-100',
          accent: 'text-yellow-800',
        };
      default:
        return {
          banner: 'from-emerald-600 to-emerald-700 text-white',
          badge: 'bg-emerald-900 text-emerald-100',
          accent: 'text-emerald-800',
        };
    }
  };

  const colors = getSeverityColor(incident.severity);

  return (
    <div className="space-y-6 pb-16">
      {/* Top breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          {incident.status !== 'RESOLVED' && (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Situation Resolved</span>
            </button>
          )}

          <button
            onClick={() => setUpdateModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Field Update</span>
          </button>
        </div>
      </div>

      {/* 🚨 HERO SEVERITY HEADER (Section 23 of App Flow) */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${colors.banner} p-6 shadow-xl space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full uppercase font-black tracking-widest ${colors.badge}`}
            >
              {incident.severity} RISK
            </span>
            <span className="text-xs opacity-90 font-medium">
              Incident Status: <strong className="uppercase">{incident.status}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs opacity-90">
            <Clock className="w-3.5 h-3.5" />
            <span>Valid until next reassessment at {new Date(assessment?.reviewAt || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {incident.title}
          </h1>
          <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-3xl">
            {farm?.name} ({farm?.crop.toUpperCase()} • {farm?.cropStage.toUpperCase()} STAGE) • {farm?.location.village}
          </p>
        </div>

        {/* Verification Status Pill */}
        {incident.verification && (
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur px-3 py-1.5 rounded-xl text-xs">
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>
              Verified by <strong>{incident.verification.workerName}</strong>: {incident.verification.observation}
            </span>
          </div>
        )}
      </div>

      {/* 🚨 THE HERO ACTION GRID: DO NOW, AVOID, MONITOR (Section 23 & 50) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. DO NOW (Priority Emerald Card) */}
        <div className="md:col-span-2 bg-white rounded-2xl border-2 border-emerald-500/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                DO NOW — Immediate Actions
              </h2>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              High Priority
            </span>
          </div>

          <div className="space-y-3">
            {actionPlan?.doNow.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span>{action}</span>
              </div>
            ))}
          </div>

          {/* Do Next secondary actions */}
          {actionPlan && actionPlan.doNext.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Do Next (After Immediate Water Recedes)
              </span>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600">
                {actionPlan.doNext.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 2. AVOID & MONITOR Cards */}
        <div className="space-y-6">
          {/* AVOID (Red Warning Card) */}
          <div className="bg-red-50/70 rounded-2xl border-2 border-red-300 p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-900 pb-2 border-b border-red-200">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-black text-sm uppercase tracking-tight">
                AVOID (Harmful Actions)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-red-900 font-medium">
              {actionPlan?.avoid.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* MONITOR Card */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 pb-2 border-b border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider">
                Watch & Monitor
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-900">
              {actionPlan?.monitor.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Escalation & Field Worker Notice */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <UserCheck className="w-4 h-4" />
              <span>Field Worker Escalation</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {assessment?.escalationRequired
                ? '🚨 High severity logged. Assigned to local Agri Extension Officer Ramesh Kumar in the verification queue.'
                : 'Self-resolution protocol active. Reassessment will trigger if rainfall continues.'}
            </p>
          </div>
        </div>
      </div>

      {/* 🧠 "WHY THIS RECOMMENDATION?" (AI Explanation Layer - Section 24 of App Flow) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Why are you recommending these actions?
              </h3>
              <p className="text-xs text-slate-500">
                AI contextual explanation grounded strictly in verified field evidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
              Provider: {explanation?.source === 'ai_adapter_gemini' ? 'Gemini 1.5' : 'Deterministic Agro-Engine'}
            </span>
            <button
              onClick={() => setShowRuleDetails(!showRuleDetails)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>{showRuleDetails ? 'Hide Agronomic Rules' : 'Inspect Rule Specs'}</span>
              {showRuleDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {loadingAi ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Formulating verified explanation...</span>
          </div>
        ) : (
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p className="font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {explanation?.summary || assessment?.rationale}
            </p>

            {explanation?.why && explanation.why.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Contributing Factors:
                </span>
                <ul className="space-y-1 text-xs">
                  {explanation.why.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Expandable Agronomic Rule Details */}
        {showRuleDetails && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-2 mt-3 animate-in fade-in">
            <div className="flex justify-between items-center text-slate-600">
              <span>Deterministic Rule ID:</span>
              <span className="font-bold text-slate-900">{assessment?.ruleVersion}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Safety Gate Status:</span>
              <span className="font-bold text-emerald-700">PASSED (Actions Filtered)</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Escalation Enforced:</span>
              <span className="font-bold text-amber-700">
                {assessment?.escalationRequired ? 'YES (High Consequence Alert)' : 'NO'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-sans">
              Rule condition: In tillering paddy, rainfall &gt;= 50mm + standing water &gt;= 24h triggers HIGH RISK.
              Granular fertilizer application is strictly disallowed by the Safety Gate.
            </div>
          </div>
        )}
      </div>

      {/* 📊 EVIDENCE VIEW (Section 25 of App Flow) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Underlying Evidence Records
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {incident.evidence.length} sources
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Strength:{' '}
            <strong className="text-emerald-700 font-bold">
              {assessment?.evidenceStrength}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {incident.evidence.map((ev) => {
            const freshnessState = getFreshnessState(ev.freshnessMinutes);
            const freshnessColor =
              freshnessState === 'FRESH'
                ? 'bg-emerald-100 text-emerald-800'
                : freshnessState === 'AGING'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800';

            return (
              <div
                key={ev.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {ev.source.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${freshnessColor}`}>
                    {freshnessState} ({ev.freshnessMinutes}m ago)
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-base font-black text-slate-900">
                    {ev.value} {ev.unit}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {ev.type.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Reliability: {ev.reliability}</span>
                  <span className="font-semibold text-emerald-700">{ev.strength}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📜 AUDIT TIMELINE (Section 37 of App Flow) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Incident Audit Timeline & Progression
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {incident.timeline.length} events logged
          </span>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
          {incident.timeline.map((event) => (
            <div key={event.id} className="relative space-y-1">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-600 shadow-sm" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{event.title}</span>
                {event.badge && (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    {event.badge}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 ml-auto">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-600">{event.description}</p>
              {event.actor && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  Actor: {event.actor}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: ADD FIELD UPDATE (Section 34) */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Add Field Observation Update
              </h3>
              <button onClick={() => setUpdateModalOpen(false)}>
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleAddUpdate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  What did you observe?
                </label>
                <select
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="standing_water_depth">Current Standing Water Depth (cm)</option>
                  <option value="standing_water_duration">Standing Water Duration (hours)</option>
                  <option value="rainfall_24h">Additional Rainfall (mm)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Observed Value
                </label>
                <input
                  type="number"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                  min="0"
                  max="120"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Example: If water drained after cutting the bund, enter &quot;4&quot; cm.
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Adding this evidence will trigger an immediate dynamic reassessment through the deterministic Risk Engine.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpdate}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingUpdate ? 'Reassessing...' : 'Submit & Reassess'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLUTION OUTCOME FORM (Section 38 & 39) */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Resolve Incident & Record Outcome
              </h3>
              <button onClick={() => setResolveModalOpen(false)}>
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleResolveIncident} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Did the situation improve?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'partially', 'no'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSituationImproved(opt)}
                      className={`p-2 rounded-xl border text-center font-bold capitalize transition-all ${
                        situationImproved === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Current Crop Condition
                </label>
                <input
                  type="text"
                  value={cropCondition}
                  onChange={(e) => setCropCondition(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Farmer Feedback & Lessons Learned
                </label>
                <textarea
                  rows={2}
                  value={farmerFeedback}
                  onChange={(e) => setFarmerFeedback(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingResolve ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
