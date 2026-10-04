/**
 * MongoDB persistence for the FarmRescue in-memory store.
 *
 * Design:
 * - Hydrate on boot: if the `incidents` collection has a snapshot, load it
 *   into the store singleton BEFORE the first API request can touch it. If
 *   the remote is unreachable, fall back to seed data and keep retrying in
 *   the background — the app never blocks on the database.
 * - Write-behind: every mutation marks the state dirty; a debounced flush
 *   (default 800ms) writes the full snapshot with `$set` on a fixed doc id,
 *   so rapid mutations coalesce into one network write.
 * - Snapshot storage (one document per collection) keeps the wire protocol
 *   simple and atomic; domain objects are JSON-clean ISO strings, so they
 *   round-trip BSON without casting.
 */

import { Farm, Incident } from '@/types';
import { MongoConnection, parseMongoUri } from '../mongo/client';

const STATE_DOC_ID = 'farmrescue-state';
const FLUSH_DEBOUNCE_MS = 800;
const HYDRATE_TIMEOUT_MS = 8000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 60_000;

export type PersistenceMode = 'disabled' | 'connecting' | 'connected' | 'degraded';

export interface PersistenceStatus {
  mode: PersistenceMode;
  database: string;
  host: string;
  lastWriteAt: string | null;
  lastError: string | null;
  pendingFlush: boolean;
  hydrated: boolean;
}

interface PersistedState {
  incidents: Incident[];
  farms: Farm[];
  schemaVersion: number;
  savedAt: string;
}

class PersistenceManager {
  private conn: MongoConnection | null = null;
  private mode: PersistenceMode = 'disabled';
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;
  private hydrated = false;
  private lastWriteAt: string | null = null;
  private lastError: string | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private retryDelayMs = RETRY_BASE_MS;
  private connectRef: Promise<boolean> | null = null;
  private hydrateLoader: ((state: PersistedState) => void) | null = null;
  /** Mutations applied locally since boot — used to win the hydrate race. */
  private localMutations = 0;

  private getIncidents: (() => Incident[]) | null = null;
  private getFarms: (() => Farm[]) | null = null;

  private get uri(): string | undefined {
    const env = process.env.MONGODB_URI?.trim();
    return env || undefined;
  }

  get enabled(): boolean {
    return !!this.uri;
  }

  get status(): PersistenceStatus {
    const uri = this.uri;
    let database = '';
    let host = '';
    if (uri) {
      try {
        const p = parseMongoUri(uri);
        database = p.database || 'test';
        host = p.hosts[0];
      } catch {
        host = '(unparseable URI)';
      }
    }
    return {
      mode: this.mode,
      database,
      host,
      lastWriteAt: this.lastWriteAt,
      lastError: this.lastError,
      pendingFlush: this.dirty || this.flushing,
      hydrated: this.hydrated,
    };
  }

  /**
   * Load the persisted snapshot into the store before first use.
   * Returns true when persisted data was loaded; false means disabled,
   * unreachable (seed fallback + background retry), or empty database.
   */
  async hydrate(load: (state: PersistedState) => void): Promise<boolean> {
    if (!this.enabled) return false;
    if (this.hydrated) return true;
    this.hydrateLoader = load;
    this.mode = 'connecting';

    const ok = await this.ensureConnected();
    if (!ok) {
      this.mode = 'degraded';
      this.scheduleRetry();
      return false;
    }

    try {
      const reply = await this.conn!.command(
        {
          find: 'incidents',
          filter: { _id: STATE_DOC_ID },
          limit: 1,
          projection: { state: 1 },
        },
        HYDRATE_TIMEOUT_MS,
      );
      const batch = (reply.cursor ?? {}) as { firstBatch?: Array<Record<string, unknown>> };
      const doc = batch.firstBatch?.[0];
      this.hydrated = true;
      this.mode = 'connected';
      this.lastError = null;

      const state = doc?.state as PersistedState | undefined;
      if (
        state &&
        Array.isArray(state.incidents) &&
        state.incidents.length > 0 &&
        Array.isArray(state.farms)
      ) {
        if (this.localMutations > 0) {
          // A mutation already landed while hydration was in flight (slow
          // dev-mode first compile, cold TLS, etc.). We HAVE the baseline in
          // hand, so this is a deliberate local-wins: keep the user's state,
          // never clobber it with the stale snapshot, and write it back.
          this.dirty = true;
          this.scheduleFlush();
          return true;
        }
        load(state);
        this.dirty = false; // adopted the remote baseline — don't echo it back
        return true;
      }
      // Connected, but empty database: persist the current (seed) baseline
      // promptly so a fresh deployment is durable even before first mutation.
      this.scheduleFlush();
      return false;
    } catch (err) {
      this.mode = 'degraded';
      this.lastError = err instanceof Error ? err.message : String(err);
      this.scheduleRetry();
      return false;
    }
  }

  /** Give the manager live accessors into the store so flushes see fresh state. */
  bindState(getters: { getIncidents: () => Incident[]; getFarms: () => Farm[] }): void {
    this.getIncidents = getters.getIncidents;
    this.getFarms = getters.getFarms;
  }

  /**
   * Called by the store after ANY mutation. `seed` marks the boot-time demo
   * seed: it must NOT count as a user mutation, otherwise the hydrate
   * local-wins policy would discard the remote snapshot on every fresh boot
   * and clobber it with seed data.
   */
  markDirty(source: 'seed' | 'mutation' = 'mutation'): void {
    if (!this.enabled) return;
    if (source === 'mutation') this.localMutations++;
    this.dirty = true;
    if (!this.hydrated) return; // still booting; flush happens after hydrate
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.flushing || !this.dirty) return;
    if (!this.getIncidents || !this.getFarms) return;
    if (!this.hydrated) {
      // Never write a snapshot we could not baseline against: a blind write
      // here could overwrite data from a previous run that we failed to read.
      // The mutation stays dirty in memory and remote data stays authoritative.
      return;
    }

    if (!this.conn?.isConnected) {
      const ok = await this.ensureConnected();
      if (!ok) {
        this.scheduleRetry();
        return;
      }
    }

    this.flushing = true;
    this.dirty = false;
    const state: PersistedState = {
      incidents: this.getIncidents(),
      farms: this.getFarms(),
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
    };

    try {
      const reply = await this.conn!.command(
        {
          update: 'incidents',
          updates: [
            {
              q: { _id: STATE_DOC_ID },
              u: { $set: { state } },
              upsert: true,
            },
          ],
        },
        20000,
      );
      if (reply.ok === 1) {
        this.lastWriteAt = new Date().toISOString();
        this.lastError = null;
        if (this.mode !== 'connected') this.mode = 'connected';
      } else {
        throw new Error(`update rejected: ${JSON.stringify(reply).slice(0, 200)}`);
      }
    } catch (err) {
      this.dirty = true; // retry on next mutation or scheduled retry
      this.mode = 'degraded';
      this.lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        '[farmrescue:persistence] flush failed, will retry:',
        this.lastError,
      );
      this.scheduleRetry();
    } finally {
      this.flushing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer || !this.enabled) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryDelayMs = Math.min(this.retryDelayMs * 2, RETRY_MAX_MS);
      void (async () => {
        const ok = await this.ensureConnected();
        if (!ok) {
          this.scheduleRetry();
          return;
        }
        if (!this.hydrated) {
          // Late-safe hydration: only when no local edits exist yet, so a
          // state swap cannot lose anything the user did in the meantime.
          if (!this.dirty && this.hydrateLoader) {
            await this.hydrate(this.hydrateLoader);
          }
        } else if (this.dirty) {
          await this.flush();
        }
      })();
    }, this.retryDelayMs);
  }

  /** Single-flight connect; resolves false instead of throwing. */
  private async ensureConnected(): Promise<boolean> {
    if (this.conn?.isConnected) return true;
    if (this.connectRef) return this.connectRef;

    this.connectRef = (async () => {
      try {
        const uri = this.uri;
        if (!uri) return false;
        this.conn = await MongoConnection.create(uri);
        this.conn.onDisconnect = () => {
          // Socket dropped: flag degraded so status is truthful; the client's
          // internal reconnect loop owns socket recovery. If dirty work is
          // pending, keep a retry ticking so the flush eventually lands.
          this.mode = 'degraded';
          if (this.dirty || !this.hydrated) this.scheduleRetry();
        };
        this.retryDelayMs = RETRY_BASE_MS;
        return true;
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        if (this.conn) {
          this.conn.close();
          this.conn = null;
        }
        return false;
      } finally {
        this.connectRef = null;
      }
    })();
    return this.connectRef;
  }

  close(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.conn?.close();
    this.conn = null;
  }
}

// Cached on globalThis like the store, so Next.js dev HMR never splits the
// write-behind queue across module copies.
const globalForPersistence = globalThis as unknown as { __farmrescuePersistence?: PersistenceManager };
export const persistence = globalForPersistence.__farmrescuePersistence ?? new PersistenceManager();
globalForPersistence.__farmrescuePersistence = persistence;
