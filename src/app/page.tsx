'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Clock,
  Layers,
  CheckCircle,
  FileText,
  Activity,
} from 'lucide-react';
import { Farm, Incident } from '@/types';
import { WeatherData } from '@/domain/weather/adapter';

export default function FarmerDashboard() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [farmsRes, incidentsRes, weatherRes] = await Promise.all([
        fetch('/api/farms').then((r) => r.json()),
        fetch('/api/incidents').then((r) => r.json()),
        fetch('/api/weather').then((r) => r.json()),
      ]);

      if (farmsRes.success && farmsRes.data.length > 0) {
        setFarm(farmsRes.data[0]);
      }
      if (incidentsRes.success) {
        setIncidents(incidentsRes.data);
      }
      if (weatherRes.success) {
        setWeather(weatherRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to custom reassessment events from simulation drawer
    const handleReassessEvent = () => {
      loadData();
    };
    window.addEventListener('farmrescue:reassessed', handleReassessEvent);
    return () => {
      window.removeEventListener('farmrescue:reassessed', handleReassessEvent);
    };
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white animate-pulse font-extrabold';
      case 'HIGH':
        return 'bg-amber-500 text-white font-bold';
      case 'MODERATE':
        return 'bg-yellow-400 text-slate-900 font-bold';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 font-medium';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Activity className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Checking farm & weather status...</p>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Top Welcome & Farm Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Farmer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, <span className="font-semibold text-slate-800">{farm?.ownerName || 'Farmer'}</span>
          </p>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Monitoring Active
          </div>
        </div>
      </div>

      {/* 🚨 Emergency Callout Banner (App Flow Section 4 & 5) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 text-white shadow-xl shadow-red-600/15">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-black/20 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-sm uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              Emergency Response Core
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Something wrong with your farm right now?
            </h2>
            <p className="text-sm text-red-50 max-w-xl">
              Water standing in the crop? Leaves yellowing? Tell FarmRescue what you see.
              The deterministic risk engine evaluates evidence immediately and provides actionable guidance.
            </p>
          </div>

          <Link
            href="/incidents/new"
            className="shrink-0 flex items-center gap-2 bg-white hover:bg-slate-50 text-red-600 font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm"
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Report a Problem Now</span>
            <ArrowRight className="w-4 h-4 text-red-600" />
          </Link>
        </div>

        {/* Background decorative watermark */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Grid: Farm Profile + Weather Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Farm Profile Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl shadow-sm">
                🌾
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{farm?.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {farm?.location.village}, {farm?.location.district} ({farm?.location.state})
                </p>
              </div>
            </div>

            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono font-medium">
              {farm?.areaAcres} Acres
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Crop & Variety
              </span>
              <span className="font-bold text-slate-800 uppercase capitalize">
                {farm?.crop}
              </span>
              <div className="text-[11px] text-slate-500 truncate">{farm?.cropVariety}</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Growth Stage
              </span>
              <span className="font-bold text-amber-700 capitalize">
                {farm?.cropStage.replace('_', ' ')}
              </span>
              <div className="text-[10px] text-slate-400">Submergence risk high</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Soil Type
              </span>
              <span className="font-bold text-slate-800 capitalize">
                {farm?.soilType.replace('_', ' ')}
              </span>
              <div className="text-[10px] text-slate-400">High water retention</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Drainage
              </span>
              <span
                className={`font-bold capitalize ${
                  farm?.drainage === 'poor' ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {farm?.drainage}
              </span>
              <div className="text-[10px] text-slate-400">Canal runoff dependent</div>
            </div>
          </div>
        </div>

        {/* Live Weather Widget */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Live Environmental Evidence
              </span>
              <span className="bg-slate-800 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-blue-300 font-mono">
                {weather?.source === 'open_meteo_live' ? 'Live API' : 'Calibrated'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <div>
                <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                  {weather?.rainfall24hMm}
                  <span className="text-base font-normal text-slate-400">mm / 24h</span>
                </div>
                <div className="text-xs text-amber-300 font-medium mt-0.5">
                  {weather?.conditionDescription}
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold flex items-center justify-end text-slate-200">
                  <Thermometer className="w-5 h-5 text-amber-400 mr-0.5" />
                  {weather?.temperatureC}°C
                </div>
                <div className="text-[11px] text-slate-400">Ambient Temp</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/60 text-center text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Humidity</span>
              <span className="font-bold text-slate-200">{weather?.humidityPct}%</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Wind</span>
              <span className="font-bold text-slate-200">{weather?.windSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Next 24h Rain</span>
              <span className="font-bold text-blue-400">+{weather?.forecastRainfallMm} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Active Incidents</h2>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {activeIncidents.length}
            </span>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All & Past Outcomes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">All Clear! No Active Incidents</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your farm is currently operating normally. If weather shifts or you observe standing water, report it immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider ${getSeverityBadge(
                        incident.severity
                      )}`}
                    >
                      {incident.severity} RISK
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{incident.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Started {new Date(incident.startedAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600">
                      Rule: {incident.currentAssessment?.ruleVersion.split('-')[0]}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600">
                  {incident.description}
                </p>

                {/* Contributing evidence preview */}
                {incident.currentAssessment && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" /> Evidence signals:
                    </span>
                    {incident.currentAssessment.contributingEvidence.map((ev, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                )}

                {/* Primary DO NOW Action highlight */}
                {incident.currentActionPlan && incident.currentActionPlan.doNow.length > 0 && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-800">
                        Immediate Action (DO NOW)
                      </span>
                      {incident.currentActionPlan.doNow[0]}
                    </div>
                  </div>
                )}

                {/* Action CTA */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    Status: <span className="font-semibold text-slate-700">{incident.status}</span>
                  </div>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all hover:scale-105"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Response & Emergency Action Plan</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Architectural Guarantee Card */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
        <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
          🌱
        </div>
        <div className="space-y-1">
          <p className="font-bold text-emerald-950">
            FarmRescue Architectural Invariant: Deterministic Safety Before AI
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Agricultural decisions and risk levels are computed deterministically using verified agronomic thresholds
            (ICAR / IRRI guidelines for paddy waterlogging). AI adapters explain and contextualize these results—they
            cannot invent diagnoses, bypass the Safety Gate, or hallucinate dangerous chemical sprays.
          </p>
        </div>
      </div>
    </div>
  );
}
