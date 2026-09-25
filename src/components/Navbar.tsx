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
    { href: '/incidents/new', label: 'Report Incident', icon: PlusCircle, isEmergency: true },
    { href: '/field-worker', label: 'Field Worker Queue', icon: UserCheck },
    { href: '/history', label: 'History & Audits', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🌾</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  FarmRescue
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  AGRITHON
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Evidence-First Emergency Response
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              if (link.isEmergency) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all hover:scale-105 ml-2"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Report a Problem</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Simulation & Role Bar */}
          <div className="flex items-center space-x-2">
            {onOpenSimulation && (
              <button
                onClick={onOpenSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Simulate Weather Shift</span>
                <span className="sm:hidden">Simulate</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  link.isEmergency
                    ? 'bg-red-50 text-red-700 font-bold'
                    : isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
