'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Sliders,
  UserCheck,
  History,
  PlusCircle,
  Home,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onOpenSimulation?: () => void;
}

export default function Navbar({ onOpenSimulation }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: '/', label: 'My Farm', icon: Home },
    // Field Map (/field) + Plot Registry (/plots) parked for the demo build:
    // the registry only finds plots registered inside FarmRescue and kept being
    // clobbered by multi-server writes; revisit with a real land-records API.
    { href: '/incidents/new', label: 'Report Incident', icon: PlusCircle, isEmergency: true },
    { href: '/field-worker', label: 'Field Worker Queue', icon: UserCheck },
    { href: '/history', label: 'Incident History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
              <span className="text-2xl">🌾</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                  FarmRescue
                </span>
                <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Agricultural Emergency Early Warning & Response
              </p>
            </div>
          </Link>

          {/* Desktop Navigation with increased text sizes */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              if (link.isEmergency) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/25 transition-all hover:scale-105 ml-3"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Report a Problem</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'text-emerald-800 bg-emerald-50 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Scenario Testing / Simulator Button */}
          <div className="flex items-center space-x-3">
            {onOpenSimulation && (
              <button
                onClick={onOpenSimulation}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all shadow-sm"
              >
                <Sliders className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline">Scenario Simulator</span>
                <span className="sm:hidden">Simulator</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold ${
                  link.isEmergency
                    ? 'bg-red-50 text-red-700'
                    : isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
