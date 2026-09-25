'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import SimulationDrawer from './SimulationDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [activeIncidentId] = useState('inc-waterlogging-demo');

  const handleReassessed = () => {
    // Dispatch custom event to notify current page to refresh data
    window.dispatchEvent(new CustomEvent('farmrescue:reassessed'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar onOpenSimulation={() => setSimulationOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Floating Simulation Trigger */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setSimulationOpen(true)}
          className="flex items-center gap-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-5 py-3 rounded-full shadow-xl shadow-amber-600/30 text-sm font-bold transition-all hover:scale-105"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
          <span>⚡ Field Scenario Simulator</span>
        </button>
      </div>

      <SimulationDrawer
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        incidentId={activeIncidentId}
        onReassessed={handleReassessed}
      />

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-600">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-bold text-base text-slate-800">
            FarmRescue — Evidence-First Agricultural Early Warning & Response
          </p>
          <p className="text-slate-500">
            Deterministic agricultural risk engine and pre-action safety gate precede generative explanations.
          </p>
        </div>
      </footer>
    </div>
  );
}
