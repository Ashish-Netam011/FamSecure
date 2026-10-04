'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';

export interface SearchResult {
  lat: number;
  lng: number;
  label: string;
  kind: string;
}

/**
 * Debounced location search (village/town/landmark/district).
 * Results move the map — they never claim to BE the user's field;
 * the farmer must still confirm by pin/confirm flow.
 */
export default function FieldSearch({ onPick }: { onPick: (r: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 3) {
      setResults([]);
      setNote(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults(json.data ?? []);
        setNote(json.note ?? null);
        setOpen(true);
      } catch {
        setResults([]);
        setNote('Location search is temporarily unavailable — you can still place the pin manually.');
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search village, town, landmark or district…"
          className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          aria-label="Search field location"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {open && (results.length > 0 || note) && (
        <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {note && (
            <div className="px-4 py-2.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
              {note}
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              onClick={() => {
                onPick(r);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-start gap-2.5 border-b border-slate-50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-700 leading-snug">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
