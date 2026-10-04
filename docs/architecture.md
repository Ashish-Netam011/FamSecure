# FarmRescue — System Architecture

**Version:** 1.0
**Status:** Reflects the implemented system (September 2026)
**Product:** FarmRescue 🌾 — Agricultural Emergency Early Warning & Response
**Companion docs:** [`prd.md`](prd.md) (features & specs) · [`trd.md`](trd.md) (technical requirements) · [`app-flow.md`](app-flow.md) (UX flows)

---

## 1. Architecture Overview

FarmRescue is an **evidence-first agricultural early-warning and response platform** built as a **single Next.js 14 (App Router) application** — React UI and API route handlers in one deployable, TypeScript end-to-end, Tailwind for styling.

The architecture is designed around one strict boundary:

> **Data and validated agricultural rules determine risk and allowed actions. AI explains validated results; AI does not independently decide what a farmer should do.**

### Core loop

```text
Detect → Verify → Assess → Act → Monitor → Reassess → Learn
```

---

## 2. High-Level Architecture

```text
        FARMER (web)                         FIELD WORKER (web)
   /  /incidents/new  /incidents/:id        /field-worker
   /  /history
        │            │
        ▼            ▼
┌──────────────────────────────────────────────────────────┐
│                NEXT.JS 14 APP ROUTER (single app)         │
│                                                          │
│  ┌─ Presentation (React, client components) ───────────┐ │
│  │ Dashboard · Wizard · Action Screen · Field Queue    │ │
│  │ History · Scenario Simulator drawer                 │ │
│  │ (live refresh via `farmrescue:reassessed` event)    │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │ fetch()                        │
│  ┌─ API Route Handlers (src/app/api/**) ───────────────┐ │
│  │ farms · incidents · evidence · reassess · verify    │ │
│  │ outcome · explain · weather · simulation/reset      │ │
│  │ system/persistence                                  │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                │
│  ┌─ Domain Layer (src/domain/**) ──────────────────────┐ │
│  │                                                     │ │
│  │  Store singleton (in-memory, globalThis-cached)     │ │
│  │    │                                                │ │
│  │    ├─► Evidence Engine (normalize + freshness)      │ │
│  │    │        ↓                                       │ │
│  │    ├─► Risk Engine (4 versioned rule families)      │ │
│  │    │        ↓                                       │ │
│  │    ├─► Safety Gate (sufficiency, conflicts,         │ │
│  │    │        interception, escalation)               │ │
│  │    │        ↓                                       │ │
│  │    ├─► Recommendation Library (12 pre-stored        │ │
│  │    │        plans, ruleFamily::riskLevel)           │ │
│  │    │        ↓                                       │ │
│  │    └─► AI Adapter (Gemini explain; deterministic    │ │
│  │             fallback)  [on /explain only]           │ │
│  │                                                     │ │
│  │  Weather Adapter (Open-Meteo, 15-min cache,         │ │
│  │                  calibrated fallback)               │ │
│  └──────────┬──────────────────────────────────────────┘ │
│             │ markDirty() → debounced write-behind       │
│  ┌─ Persistence Layer (src/lib/**) ────────────────────┐ │
│  │ persistence/mongo.ts (hydrate, flush, retry, status)│ │
│  │ mongo/client.ts (TLS · SRV · SCRAM · OP_MSG ·       │ │
│  │                  reconnect)  mongo/bson.ts          │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          ▼
              ┌───────────────────────┐   ┌──────────────────┐
              │ MongoDB (Atlas)       │   │ External APIs    │
              │ FarmRescue database   │   │ Open-Meteo       │
              │ snapshot: farms +     │   │ Gemini API       │
              │ incidents (one doc)   │   └──────────────────┘
              └───────────────────────┘
```

**Deferred components** (present in v0.1 draft, not built): Notification Service (SMS/WhatsApp/IVR), PostgreSQL + PostGIS store, Express server, auth layer.

---

## 3. Architecture Principles

### 3.1 Evidence First
Every risk assessment is traceable to structured evidence. Each evidence item carries source, observation/retrieval timestamps, freshness minutes, strength, and reliability. Stale data is surfaced (🟢🟡🔴), never hidden.

### 3.2 AI Second
The LLM sits **after** the deterministic risk + safety layers and is invoked only by the `/explain` endpoint. It receives validated facts only and is prompt-bound: it may not alter the assessment, invent weather facts, or recommend pesticides. It cannot reach the decision path.

### 3.3 Data Freshness Is First-Class
Freshness bands: FRESH ≤ 30 min · AGING ≤ 3 h · STALE ≤ 24 h · UNAVAILABLE > 24 h. Evidence strength is computed from source mix + freshness.

### 3.4 Recommendations Are Time-Bounded
Every assessment carries `assessedAt`, `reviewAt` (+3h CRITICAL / +6h HIGH / +12h else), `ruleVersion`, `evidenceStrength`. Note: `reviewAt` is currently **display-only** — no background scheduler exists (PRD §14.4).

### 3.5 Human Escalation
HIGH/CRITICAL → field-worker queue. Insufficient or conflicting evidence → forced escalation. LOW/NORMAL → self-monitoring.

### 3.6 Deterministic Decisions, Pre-Stored Content
Plans come from a versioned library keyed `ruleFamily::riskLevel` (12 entries, fallback resolution). Same inputs → same plan, instantly, no generation step.

### 3.7 Fail-Safe Degradation
Every external dependency has a fallback that preserves the full user experience:

| Dependency | Failure mode | Fallback |
|---|---|---|
| Open-Meteo | unreachable/error | Calibrated agro-climatic model values (`source: fallback_climate_model`) |
| Gemini | no key / 429 / 5xx / unparseable | Deterministic explanation renderer (`source: deterministic_fallback`); 4-attempt retry first |
| MongoDB | unreachable at boot or mid-run | In-memory seed/state; exponential retry 2 s → 60 s; mode `degraded` is visible on status endpoint |

---

## 4. Application Layers

- **Layer 1 — Presentation** (`src/app/**` pages, `src/components/**`): farmer mobile-first web UI + field-worker dashboard + simulator drawer. Client components share reassessment via the `farmrescue:reassessed` window event.
- **Layer 2 — API** (`src/app/api/**`): Next.js route handlers; uniform `{ success, data | error }` envelope; thin — they delegate to the domain store.
- **Layer 3 — Domain** (`src/domain/**`): evidence, weather, risk engine, safety gate, actions/templates, AI adapter, store singleton.
- **Layer 4 — Infrastructure** (`src/lib/**`): MongoDB wire client + BSON codec, persistence manager (hydrate / write-behind / retry / status).

---

## 5. Module Map (with file paths)

| Concern | Path | Notes |
|---|---|---|
| Types (single source) | `src/types/index.ts` | All 10 entities + enums; JSON-clean (ISO strings) |
| Store singleton | `src/domain/store/index.ts` | In-memory; `globalThis`-cached vs dev HMR; every mutation → `persistence.markDirty()` |
| Risk engine | `src/domain/risk/rules.ts` | `RULE_VERSIONS`; threshold logic; rule-priority policy |
| Evidence freshness | `src/domain/evidence/freshness.ts` | Freshness bands + strength classification |
| Safety gate | `src/domain/safety/safetyGate.ts` | Sufficiency, conflict detection, interception, escalation |
| Recommendation library | `src/domain/actions/recommendations.ts` | 12 pre-stored plans + `getStoredRecommendation()` |
| Plan assembly | `src/domain/actions/templates.ts` | Library lookup → full `ActionPlan` (adds `why`, `reviewAt`, version) |
| AI adapter | `src/domain/ai/adapter.ts` | Gemini REST, retry ×4, deterministic fallback, `source` tag |
| Weather adapter | `src/domain/weather/adapter.ts` | Open-Meteo + fallback model |
| Persistence manager | `src/lib/persistence/mongo.ts` | Hydrate-on-boot, ~800 ms debounced write-behind, exponential retry, status |
| Mongo wire client | `src/lib/mongo/client.ts` | TLS, SRV discovery, SCRAM-SHA-256 (SHA-1 fallback), OP_MSG, reconnect |
| BSON codec | `src/lib/mongo/bson.ts` | Minimal encoder/decoder subset, byte-compatible with official lib |
| API routes | `src/app/api/**/route.ts` | 13 endpoints (PRD §12) |

---

## 6. Data Flow

### 6.1 Incident assessment (write path)

```text
POST /api/incidents
  → store.createIncident()
      → evidence list assembled (weather_provider + farmer inputs)
      → evaluateRisk(farm, evidence, incidentType)     # rules.ts
      → evaluateSafetyGate(assessment, farm, evidence) # safetyGate.ts
            → generateActionPlan() → recommendations library lookup
      → incident persisted in memory; persistence.markDirty()
  ← 201 { incident (with currentAssessment + currentActionPlan) }
      └─ (≤800 ms later) snapshot upserted to MongoDB
```

### 6.2 Reassessment (append-only)

```text
POST /api/incidents/:id/reassess   (or evidence added)
  → evaluateRisk on current evidence (+ simParams evidence swaps if simulator)
  → safety gate → new plan from library
  → currentAssessment replaced, assessmentsHistory appended, timeline entry added
  → markDirty() → debounced flush
  → broadcast `farmrescue:reassessed` (client refetch on all open dashboards)
```

### 6.3 AI explanation (read-only side channel)

```text
POST /api/incidents/:id/explain
  → load incident + farm (memory)
  → if GEMINI_API_KEY: Gemini REST (JSON mode, ≤4 attempts, backoff on 429/5xx)
      → success → ExplanationResponse (source: ai_adapter_gemini)
  → any failure → deterministic renderer (source: deterministic_fallback)
```

### 6.4 Persistence (boot → steady state)

```text
Boot:  store constructor → seedInitialData() (not counted as mutation)
       → persistence.hydrate(): connect (TLS/SRV/SCRAM) → find snapshot doc
             snapshot found & valid → adopt into store   [mode: connected]
             snapshot absent        → persist seed soon  [mode: connected]
             unreachable            → seed stands, retry 2s→60s [mode: degraded]
Steady: mutation → markDirty() → debounce 800ms → upsert snapshot
        flush guarded: never before hydrate; never clobbers remote baseline
        socket drop → onDisconnect → degraded + retry keeps flush landing
```

---

## 7. Risk Engine & Safety Gate

Four versioned rule families — `PADDY_WATERLOGGING_001-v1.2`, `HEAT_STRESS_001-v1.0`, `PEST_DISEASE_001-v1.0`, `GENERAL_HAZARD_001-v1.0`. Full threshold tables: PRD §5.

**Rule-priority policy:** explicit incident types always route to their dedicated rule; ambient signals (rain ≥ 40 mm/24 h, standing water ≥ 12 h, temp ≥ 36 °C) auto-route only unclassified (`other`) reports.

Safety gate passes the plan through four checks (sufficiency, conflict, chemical interception, escalation enforcement) before it is shown; verdict `SUFFICIENT | INSUFFICIENT | CONFLICTING` is auditable.

## 8. AI Explanation Layer

Adapter receives validated facts only (assessment, plan excerpts, evidence) and produces a strict-JSON explanation with a mandatory `source` provenance field. It must never invent evidence or override deterministic classifications. Failure of any kind resolves to the deterministic renderer — the endpoint has no error path visible to the user.

## 9. Scenario Testing & Simulation Mode

Interactive drawer on the action screen. Parameters: rainfall 0–140 mm, standing-water duration 0–72 h, depth 0–35 cm, drainage, crop stage; four presets. Applied evidence is tagged `source: 'simulation'`, `reliability: 'simulated'` — **DEMO / SIMULATION DATA** is never presented as ground truth. Reset endpoint restores the seed demo state.

## 10. Dev-Mode & Runtime Notes

- **Singleton durability:** store and persistence manager are cached on `globalThis` so Next.js dev-mode route recompilation (HMR) cannot split them into diverging copies. In production there is exactly one of each.
- **Hydrate race policy:** if a user mutation lands while boot hydration is in flight, local state wins deliberately (the remote baseline is already read; local state is written back). Seed data never counts as a user mutation.
- **No scheduler:** nothing in the app runs on a timer except the persistence flush debounce and retry backoff; reassessment is entirely event/user-driven.
