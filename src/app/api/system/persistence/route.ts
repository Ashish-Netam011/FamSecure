import { NextResponse } from 'next/server';
import { persistence, PersistenceMode } from '@/lib/persistence/mongo';
// Importing the store kicks its constructor, which starts MongoDB hydration
// on first use — so this route reports a real state, not "never initialized".
import { store } from '@/domain/store';

export const dynamic = 'force-dynamic';

const SETTLED: PersistenceMode[] = ['connected', 'degraded', 'disabled'];

export async function GET() {
  // Wait (bounded) for hydration to settle so callers get a definitive answer.
  const deadline = Date.now() + 15_000;
  while (!SETTLED.includes(persistence.status.mode) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 300));
  }

  const status = persistence.status;
  const note =
    status.mode === 'disabled'
      ? 'MONGODB_URI not set — running on in-memory seed store only.'
      : status.mode === 'connected'
        ? 'MongoDB connected; mutations persist automatically (write-behind, debounced).'
        : status.mode === 'degraded'
          ? `MongoDB unreachable — in-memory store active, retrying in background. Last error: ${status.lastError ?? 'unknown'}`
          : 'MongoDB connection in progress…';

  return NextResponse.json({
    success: true,
    data: { ...status, enabled: persistence.enabled, incidentCount: store.getIncidents().length, note },
  });
}
