/**
 * Plot Registry query helpers — pure functions over the field/plot list.
 *
 * Filtering happens client-side over GET /api/fields (the in-memory store
 * already holds every plot and the payload is tiny). Hierarchy levels match
 * exactly after normalization; the khasra number matches as a substring so
 * typing "42" finds "42/1B". Empty filter = match all, so the registry with
 * nothing selected simply shows every registered plot.
 */

import { Farm } from '@/types';
import { ADMIN_LEVELS, AdminSelection } from './divisions';

const norm = (s?: string | null): string => (s ?? '').trim().toLowerCase();

export function filterPlots(
  plots: Farm[],
  sel: AdminSelection,
  khasra?: string
): Farm[] {
  const k = norm(khasra);
  return plots.filter((p) => {
    for (const level of ADMIN_LEVELS) {
      const want = norm(sel[level]);
      if (!want) continue; // unset level = no constraint
      if (norm(p.location[level]) !== want) return false;
    }
    if (!k) return true;
    return norm(p.khasraNo).includes(k);
  });
}

/** Distinct khasra numbers among plots matching the hierarchy (for datalist). */
export function khasraSuggestions(plots: Farm[], sel: AdminSelection): string[] {
  const seen = new Set<string>();
  for (const p of filterPlots(plots, sel)) {
    const k = p.khasraNo?.trim();
    if (k) seen.add(k);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
