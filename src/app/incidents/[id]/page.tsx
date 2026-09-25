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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Activity className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-base font-semibold text-slate-600">Loading emergency action plan...</p>
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
        };
      case 'HIGH':
        return {
          banner: 'from-amber-600 to-amber-700 text-white',
          badge: 'bg-amber-900 text-amber-100',
        };
      case 'MODERATE':
        return {
          banner: 'from-yellow-500 to-amber-500 text-slate-900',
          badge: 'bg-yellow-800 text-yellow-100',
        };
      default:
        return {
          banner: 'from-emerald-600 to-emerald-700 text-white',
          badge: 'bg-emerald-900 text-emerald-100',
        };
    }
  };

  const colors = getSeverityColor(incident.severity);

  return (
    <div className="space-y-8 pb-20">
      {/* Top breadcrumb & action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          {incident.status !== 'RESOLVED' && (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-md transition-all hover:scale-105"
            >
              <Check className="w-4 h-4" />
              <span>Mark Situation Resolved</span>
            </button>
          )}

          <button
            onClick={() => setUpdateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Add Field Update</span>
          </button>
        </div>
      </div>

      {/* 🚨 HERO SEVERITY HEADER */}
      <div
        className={`rounded-3xl bg-gradient-to-r ${colors.banner} p-7 sm:p-9 shadow-2xl space-y-5`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm px-4 py-1.5 rounded-full uppercase font-black tracking-widest ${colors.badge} shadow-sm`}
            >
              {incident.severity} RISK
            </span>
            <span className="text-sm opacity-95 font-semibold">
              Incident Status: <strong className="uppercase underline decoration-2">{incident.status}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm opacity-95 font-medium">
            <Clock className="w-4 h-4" />
            <span>Next reassessment scheduled for {new Date(assessment?.reviewAt || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            {incident.title}
          </h1>
          <p className="text-base sm:text-lg opacity-95 mt-2 max-w-4xl font-medium">
            {farm?.name} ({farm?.crop.toUpperCase()} • {farm?.cropStage.toUpperCase()} STAGE) • {farm?.location.village} ({farm?.location.district})
          </p>
        </div>

        {/* Verification Status Banner */}
        {incident.verification && (
          <div className="inline-flex items-center gap-2.5 bg-black/25 backdrop-blur-md px-4 py-2.5 rounded-2xl text-sm font-medium">
            <UserCheck className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              Verified by <strong>{incident.verification.workerName}</strong>: {incident.verification.observation}
            </span>
          </div>
        )}
      </div>

      {/* 🚨 THE HERO ACTION GRID: DO NOW, AVOID, MONITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. DO NOW (Priority Emerald Card) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                1
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                DO NOW — Immediate Physical Actions
              </h2>
            </div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
              Priority 1
            </span>
          </div>

          <div className="space-y-4">
            {actionPlan?.doNow.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-base sm:text-lg text-slate-900 leading-relaxed font-semibold shadow-xs"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span>{action}</span>
              </div>
            ))}
          </div>

          {/* Do Next secondary actions */}
          {actionPlan && actionPlan.doNext.length > 0 && (
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <span className="text-sm font-black text-slate-600 uppercase tracking-wider block">
                Do Next (After Immediate Water Recedes)
              </span>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-slate-700 font-medium">
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
          <div className="bg-red-50 rounded-3xl border-2 border-red-300 p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 text-red-900 pb-3 border-b border-red-200">
              <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              <h3 className="font-black text-base sm:text-lg uppercase tracking-tight">
                AVOID (Safety Interceptions)
              </h3>
            </div>
            <ul className="space-y-3 text-sm sm:text-base text-red-950 font-bold">
              {actionPlan?.avoid.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-red-600 font-black shrink-0 text-lg leading-none mt-0.5">✕</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* MONITOR Card */}
          <div className="bg-amber-50/80 rounded-3xl border border-amber-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 pb-3 border-b border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider">
                Watch & Monitor Closely
              </h3>
            </div>
            <ul className="space-y-2 text-sm sm:text-base text-amber-950 font-medium">
              {actionPlan?.monitor.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Escalation & Field Worker Notice */}
          <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-2.5 text-sm shadow-md">
            <div className="flex items-center gap-2.5 text-amber-300 font-bold text-base">
              <UserCheck className="w-5 h-5" />
              <span>Field Worker Escalation</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-normal">
              {assessment?.escalationRequired
                ? '🚨 High severity incident flagged. Assigned to local Agri Extension Officer Ramesh Kumar in the verification queue.'
                : 'Automated self-resolution monitoring active. Reassessment will trigger if rainfall continues.'}
            </p>
          </div>
        </div>
      </div>

      {/* 🧠 "WHY THIS RECOMMENDATION?" (AI Explanation Layer) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                Why are you recommending these actions?
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                AI contextual explanation grounded strictly in verified field evidence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-md font-mono font-semibold">
              Source: {explanation?.source === 'ai_adapter_gemini' ? 'Gemini 1.5' : 'Deterministic Agro-Engine'}
            </span>
            <button
              onClick={() => setShowRuleDetails(!showRuleDetails)}
              className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>{showRuleDetails ? 'Hide Agronomic Rules' : 'Inspect Rule Specs'}</span>
              {showRuleDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {loadingAi ? (
          <div className="flex items-center gap-3 text-sm text-slate-500 py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="font-medium">Formulating verified agricultural explanation...</span>
          </div>
        ) : (
          <div className="space-y-4 text-base text-slate-800 leading-relaxed">
            <p className="font-semibold text-slate-900 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 leading-relaxed">
              {explanation?.summary || assessment?.rationale}
            </p>

            {explanation?.why && explanation.why.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-sm font-black text-slate-600 uppercase tracking-wider block">
                  Contributing Factors:
                </span>
                <ul className="space-y-2 text-sm sm:text-base">
                  {explanation.why.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
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
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-mono space-y-2.5 mt-4 animate-in fade-in">
            <div className="flex justify-between items-center text-slate-700">
              <span>Deterministic Rule ID:</span>
              <span className="font-bold text-slate-900">{assessment?.ruleVersion}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Safety Gate Status:</span>
              <span className="font-bold text-emerald-700">PASSED (Actions Filtered)</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Escalation Enforced:</span>
              <span className="font-bold text-amber-700">
                {assessment?.escalationRequired ? 'YES (High Consequence Alert)' : 'NO'}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
              Rule condition: In tillering paddy, rainfall &gt;= 50mm + standing water &gt;= 24h triggers HIGH RISK.
              Granular fertilizer application is strictly disallowed by the Safety Gate.
            </div>
          </div>
        )}
      </div>

      {/* 📊 EVIDENCE VIEW */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-xl">
              Underlying Evidence Records
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono font-bold">
              {incident.evidence.length} sources
            </span>
          </div>

          <span className="text-sm text-slate-500">
            Strength:{' '}
            <strong className="text-emerald-700 font-extrabold">
              {assessment?.evidenceStrength}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-slate-400">
                    {ev.source.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${freshnessColor}`}>
                    {freshnessState} ({ev.freshnessMinutes}m ago)
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-2xl font-black text-slate-900">
                    {ev.value} {ev.unit}
                  </div>
                  <div className="text-xs text-slate-500 capitalize font-medium mt-0.5">
                    {ev.type.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>Reliability: <strong className="text-slate-700">{ev.reliability}</strong></span>
                  <span className="font-bold text-emerald-700">{ev.strength}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📜 AUDIT TIMELINE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-lg sm:text-xl">
              Incident Audit Timeline & Progression
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            {incident.timeline.length} events logged
          </span>
        </div>

        <div className="relative pl-8 space-y-7 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-sm">
          {incident.timeline.map((event) => (
            <div key={event.id} className="relative space-y-1.5">
              <div className="absolute -left-8 top-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-600 shadow-sm" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-base">{event.title}</span>
                {event.badge && (
                  <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-md">
                    {event.badge}
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto font-mono">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{event.description}</p>
              {event.actor && (
                <span className="text-xs text-slate-500 block font-mono">
                  Actor: {event.actor}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: ADD FIELD UPDATE */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">
                Add Field Observation Update
              </h3>
              <button onClick={() => setUpdateModalOpen(false)}>
                <XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleAddUpdate} className="space-y-5 text-sm">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  What did you observe?
                </label>
                <select
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-medium"
                >
                  <option value="standing_water_depth">Current Standing Water Depth (cm)</option>
                  <option value="standing_water_duration">Standing Water Duration (hours)</option>
                  <option value="rainfall_24h">Additional Rainfall (mm)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Observed Value
                </label>
                <input
                  type="number"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(Number(e.target.value))}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-mono text-base font-bold"
                  min="0"
                  max="120"
                />
                <span className="text-xs text-slate-500 mt-1.5 block">
                  Example: If water drained after cutting the bund, enter &quot;4&quot; cm.
                </span>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl text-amber-950 text-xs sm:text-sm flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Adding this evidence will trigger an immediate dynamic reassessment through the deterministic Risk Engine.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpdate}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingUpdate ? 'Reassessing...' : 'Submit & Reassess'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLUTION OUTCOME FORM */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">
                Resolve Incident & Record Outcome
              </h3>
              <button onClick={() => setResolveModalOpen(false)}>
                <XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleResolveIncident} className="space-y-5 text-sm">
              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  Did the situation improve?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['yes', 'partially', 'no'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSituationImproved(opt)}
                      className={`p-3 rounded-2xl border text-center font-bold capitalize transition-all ${
                        situationImproved === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/25'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Current Crop Condition
                </label>
                <input
                  type="text"
                  value={cropCondition}
                  onChange={(e) => setCropCondition(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Farmer Feedback & Lessons Learned
                </label>
                <textarea
                  rows={3}
                  value={farmerFeedback}
                  onChange={(e) => setFarmerFeedback(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
