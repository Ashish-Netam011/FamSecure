'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import SimulationDrawer from './SimulationDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState('inc-waterlogging-demo');

  const handleReassessed = () => {
    // Dispatch custom event to notify current page to refresh data
    window.dispatchEvent(new CustomEvent('farmrescue:reassessed'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar onOpenSimulation={() => setSimulationOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Floating Simulation Trigger for easy judge testing */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setSimulationOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-2.5 rounded-full shadow-lg shadow-amber-600/30 text-xs font-bold transition-all hover:scale-105"
        >
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
          <span>AGRITHON Simulation Controls</span>
        </button>
      </div>

      <SimulationDrawer
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        incidentId={activeIncidentId}
        onReassessed={handleReassessed}
      />

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            FarmRescue — Evidence-First Agricultural Early Warning & Response
          </p>
          <p>
            Designed for AGRITHON 2026. Deterministic risk engine precedes generative explanation.
          </p>
        </div>
      </footer>
    </div>
  );
}
