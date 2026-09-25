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
        return 'bg-amber-500 text-white font-extrabold';
      case 'MODERATE':
        return 'bg-yellow-400 text-slate-900 font-extrabold';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-semibold';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Activity className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-base font-semibold text-slate-600">Checking farm & weather status...</p>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="space-y-8">
      {/* Top Welcome & Farm Status Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Farmer Dashboard
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mt-1">
            Welcome back, <span className="font-bold text-slate-900">{farm?.ownerName || 'Farmer'}</span>
          </p>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Field Monitoring Active</span>
          </div>
        </div>
      </div>

      {/* 🚨 Emergency Callout Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-8 text-white shadow-xl shadow-red-600/20">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-black/25 text-white text-xs font-black px-3 py-1 rounded-full backdrop-blur-sm uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Emergency Response System</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Something wrong with your farm right now?
            </h2>
            <p className="text-base sm:text-lg text-red-50 leading-relaxed font-normal">
              Water standing in your field? Leaves yellowing? Tell FarmRescue what you see.
              The deterministic risk engine evaluates real-time evidence immediately and gives you clear, validated actions.
            </p>
          </div>

          <Link
            href="/incidents/new"
            className="shrink-0 flex items-center gap-3 bg-white hover:bg-slate-50 text-red-600 font-black text-base px-6 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Report a Problem Now</span>
            <ArrowRight className="w-5 h-5 text-red-600" />
          </Link>
        </div>

        {/* Background decorative watermark */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <ShieldAlert className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Grid: Farm Profile + Weather Card with larger text sizes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farm Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-3xl shadow-sm">
                🌾
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-xl sm:text-2xl">{farm?.name}</h3>
                <p className="text-sm sm:text-base text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {farm?.location.village}, {farm?.location.district} ({farm?.location.state})
                </p>
              </div>
            </div>

            <span className="text-sm bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-xl font-mono font-bold">
              {farm?.areaAcres} Acres
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider mb-1">
                Crop & Variety
              </span>
              <span className="font-extrabold text-slate-900 text-base sm:text-lg uppercase capitalize block">
                {farm?.crop}
              </span>
              <div className="text-xs text-slate-500 truncate mt-0.5">{farm?.cropVariety}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider mb-1">
                Growth Stage
              </span>
              <span className="font-extrabold text-amber-700 text-base sm:text-lg capitalize block">
                {farm?.cropStage.replace('_', ' ')}
              </span>
              <div className="text-xs text-slate-500 mt-0.5">High moisture sensitivity</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider mb-1">
                Soil Type
              </span>
              <span className="font-extrabold text-slate-900 text-base sm:text-lg capitalize block">
                {farm?.soilType.replace('_', ' ')}
              </span>
              <div className="text-xs text-slate-500 mt-0.5">High water retention</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block text-xs uppercase font-extrabold tracking-wider mb-1">
                Drainage
              </span>
              <span
                className={`font-extrabold text-base sm:text-lg capitalize block ${
                  farm?.drainage === 'poor' ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {farm?.drainage}
              </span>
              <div className="text-xs text-slate-500 mt-0.5">Canal runoff dependent</div>
            </div>
          </div>
        </div>

        {/* Live Weather Widget */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <CloudRain className="w-4 h-4 text-blue-400" /> Live Environmental Evidence
              </span>
              <span className="bg-slate-800 border border-slate-700 text-xs px-2.5 py-1 rounded-md text-blue-300 font-mono font-semibold">
                {weather?.source === 'open_meteo_live' ? 'Live API' : 'Calibrated Model'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-4">
              <div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-1.5">
                  {weather?.rainfall24hMm}
                  <span className="text-lg font-medium text-slate-400">mm / 24h</span>
                </div>
                <div className="text-sm sm:text-base text-amber-300 font-bold mt-1">
                  {weather?.conditionDescription}
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black flex items-center justify-end text-slate-100">
                  <Thermometer className="w-6 h-6 text-amber-400 mr-1" />
                  {weather?.temperatureC}°C
                </div>
                <div className="text-xs text-slate-400 font-medium">Ambient Temperature</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700/70 text-center">
            <div>
              <span className="text-slate-400 text-xs block font-medium">Humidity</span>
              <span className="font-extrabold text-base text-slate-100">{weather?.humidityPct}%</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Wind</span>
              <span className="font-extrabold text-base text-slate-100">{weather?.windSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Next 24h Rain</span>
              <span className="font-extrabold text-base text-blue-400">+{weather?.forecastRainfallMm} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents Section with increased typography */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Incidents</h2>
            <span className="bg-red-100 text-red-800 text-sm px-3 py-0.5 rounded-full font-black">
              {activeIncidents.length}
            </span>
          </div>
          <Link
            href="/history"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
          >
            <span>View All & Past Outcomes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">All Clear! No Active Incidents</h3>
            <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto">
              Your farm is currently operating normally. If weather shifts or you observe standing water, report it immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-full uppercase tracking-wider ${getSeverityBadge(
                        incident.severity
                      )}`}
                    >
                      {incident.severity} RISK
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      {incident.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Started {new Date(incident.startedAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-xs text-slate-700 font-semibold">
                      Rule: {incident.currentAssessment?.ruleVersion.split('-')[0]}
                    </span>
                  </div>
                </div>

                <p className="text-base text-slate-700 leading-relaxed font-normal">
                  {incident.description}
                </p>

                {/* Contributing evidence preview */}
                {incident.currentAssessment && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-2.5 text-sm">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" /> Ground Signals:
                    </span>
                    {incident.currentAssessment.contributingEvidence.map((ev, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 text-slate-800 px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                )}

                {/* Primary DO NOW Action highlight */}
                {incident.currentActionPlan && incident.currentActionPlan.doNow.length > 0 && (
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-sm sm:text-base text-amber-950">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block uppercase tracking-wider text-xs text-amber-800 mb-0.5">
                        Immediate Action (DO NOW)
                      </span>
                      <span className="font-semibold">{incident.currentActionPlan.doNow[0]}</span>
                    </div>
                  </div>
                )}

                {/* Action CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-sm text-slate-500">
                    Status: <strong className="text-slate-800 uppercase">{incident.status}</strong>
                  </div>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold px-6 py-3.5 rounded-2xl shadow-md transition-all hover:scale-105"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Emergency Response & Action Plan</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Architectural Guarantee Card */}
      <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-3xl flex items-start gap-3.5 text-sm text-emerald-950">
        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 text-xl">
          🌱
        </div>
        <div className="space-y-1">
          <p className="font-black text-base text-emerald-950">
            FarmRescue Architectural Invariant: Deterministic Safety Precedes AI
          </p>
          <p className="text-emerald-900 leading-relaxed font-normal">
            Agricultural decisions and risk levels are computed deterministically using verified agronomic thresholds
            (ICAR / IRRI guidelines for paddy waterlogging). AI adapters explain and contextualize these results—they
            cannot invent diagnoses, bypass the Safety Gate, or hallucinate dangerous chemical sprays.
          </p>
        </div>
      </div>
    </div>
  );
}
