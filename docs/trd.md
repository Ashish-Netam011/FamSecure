# FarmRescue — Technical Requirements Document

**Project:** FarmRescue 🌾
**Product Promise:** *"What should I do when the farm suddenly goes wrong?"*
**Document:** Technical Requirements Document (TRD)
**Version:** 2.0
**Status:** Implementation Specification — updated to match the implemented system (September 2026)
**Primary Crop:** Paddy + heavy rainfall / waterlogging
**Secondary Scenarios:** Heat stress, pest/disease incidents
**Companion docs:** [`prd.md`](prd.md) (product requirements — authoritative feature list) · [`architecture.md`](architecture.md) (system design) · [`app-flow.md`](app-flow.md) (UX flows)

---

## Change Log from v1.0

| v1.0 said | Reality (v2.0) |
|---|---|
| Node.js + Express backend | **Next.js 14 App Router route handlers** (`src/app/api/**`) — no separate server |
| PostgreSQL + PostGIS persistence | **MongoDB snapshot persistence** (optional, via `MONGODB_URI`) behind an in-memory store; zero-dependency driver built in-repo |
| Notification Service (SMS/WhatsApp/IVR) | **Deferred** — escalation text references field workers/FPO but no delivery channel exists |
| AI adapter listed as "Gemini / Mock" | **Gemini REST adapter** (default `gemini-3.8-flash`) with 4-attempt retry and a deterministic zero-failure fallback; every response tagged with `source` |
| Recommendations described as generated | **Pre-stored recommendation library** — plans are expert-authored, keyed `ruleFamily::riskLevel`, selected deterministically |
| No persistence requirements | Persistence, hydration race policy, degraded mode, and status endpoint specified (Section 6) |

---

# 1. Core Principles & Invariants

```text
Data / Sensor / Observations
        ↓
Normalized Evidence Engine
        ↓
Deterministic Risk Engine (Versioned Rules)
        ↓
Safety Gate (Sufficiency & Permissibility)
        ↓
Pre-Stored Action Plan (Do Now, Do Next, Avoid, Monitor, Escalate)
        ↓
Human-in-the-Loop Verification (Field Worker)
        ↓
AI Explanation Adapter (Gemini / deterministic fallback)
        ↓
Farmer & Field Worker UI
        ↓
Dynamic Reassessment & Outcomes
```

**Key Architectural Invariant:**
> *AI explains the evidence-backed decision; AI does not become the decision itself.*

Supporting invariants:
- **Determinism:** same evidence + farm context → same risk level and same stored plan.
- **Zero-failure answers:** no external dependency (AI, weather, database) may prevent a complete farmer-facing answer.
- **Append-only history:** reassessments never overwrite prior assessments.

---

# 2. Functional Requirements & Implementation Status

Status legend: **SHIPPED** = implemented and verified · **PARTIAL** = implemented with documented gaps (cross-ref PRD §14) · **PLANNED** = not started.

## FR-01 – FR-04: Incident & Farm Management & Evidence Scoring — **SHIPPED**
- **FR-01 Farm profiles** (SHIPPED): coordinates + address hierarchy, crop types (paddy focus; 6 modeled), variety, growth stage (8 stages), soil type (6), drainage (4), area, water source, sowing date. APIs: `GET/POST /api/farms`.
- **FR-02 Incident reporting** (SHIPPED): 6 incident types; fast wizard with symptom chips; standing-water inputs; creates assessment + plan server-side. `POST /api/incidents`.
- **FR-03 Multi-source evidence** (SHIPPED): 5 sources (`weather_provider`, `farmer_observation`, `field_worker`, `sensor`, `simulation`), 12 evidence types, reliability tags (`verified | reported | simulated | stale`). Simulation data is always tagged as simulated.
- **FR-04 Evidence classification & freshness** (SHIPPED): strength `STRONG / MODERATE / WEAK` (+ `UNVERIFIED / CONFLICTING` in the type system); freshness bands FRESH ≤ 30 min / AGING ≤ 3 h / STALE ≤ 24 h / UNAVAILABLE > 24 h; surfaced in UI as 🟢🟡🔴.

## FR-07 – FR-09: Deterministic Risk Engine & Safety Gate — **SHIPPED**
- **FR-07 Versioned rules** (SHIPPED): `PADDY_WATERLOGGING_001-v1.2`, `HEAT_STRESS_001-v1.0`, `PEST_DISEASE_001-v1.0`, `GENERAL_HAZARD_001-v1.0`. Exact thresholds in PRD §5. Rule priority: explicit incident type wins; ambient signals auto-route only `other` reports.
- **FR-08 Risk levels** (SHIPPED): `NORMAL, LOW, MODERATE, HIGH, CRITICAL` (+ `UNKNOWN` reserved). Time-bounded validity: `reviewAt = +3h (CRITICAL) / +6h (HIGH) / +12h (else)`.
- **FR-09 Safety Gate** (SHIPPED): evidence sufficiency, conflict detection (zero rain + >36h standing water), fertilizer-during-flood interception, HIGH/CRITICAL forced escalation. Output: `SUFFICIENT | INSUFFICIENT | CONFLICTING` + safety warnings.
- **FR-09a Pre-stored recommendation library** (SHIPPED): 12 expert plans keyed `ruleFamily::riskLevel` with fallback resolution; coverage matrix in PRD §6.

## FR-10: AI Explanation Adapter — **SHIPPED**
- **FR-10.1 Validated-facts-only prompt** (SHIPPED): model receives farm context, assessment, approved plan excerpts, and evidence list; prompt forbids altering the assessment, inventing weather, or recommending pesticides.
- **FR-10.2 Farmer-friendly explanation** (SHIPPED): strict JSON response (`summary`, `why[]`, `doNowExplanation[]`, `avoidExplanation[]`, `watchFor[]`, `escalationNotice`); model `gemini-3.8-flash` (env-overridable), JSON mime mode.
- **FR-10.3 Graceful fallback** (SHIPPED): 4 attempts with linear backoff on 429/5xx/network; deterministic explanation renderer guarantees an answer; `source: 'ai_adapter_gemini' | 'deterministic_fallback'` always present.

## FR-11 – FR-13: Human Verification, Timeline & Reassessment — **SHIPPED / PARTIAL**
- **FR-11 Field worker verification** (SHIPPED): queue with distance indicators; `CONFIRMED / PARTIALLY_CONFIRMED / NOT_CONFIRMED / NEEDS_MORE_INFORMATION`; severity override. *PARTIAL: worker identity hardcoded (`worker-ramesh`) pending auth.*
- **FR-12 Non-destructive reassessment** (SHIPPED): every reassessment appends a `RiskAssessment` to `assessmentsHistory`; timeline records the transition.
- **FR-13 Full auditable timeline** (SHIPPED): 6 timeline event types with actor attribution; `/history` screen.
- **FR-13a Scheduled reassessment** (PLANNED): `reviewAt` is computed and displayed but **no background scheduler exists** — reassessment is triggered only by user actions (evidence, simulator, reset). See PRD §14.4.

## FR-14: Scenario Testing & Simulation Mode — **SHIPPED**
- Interactive drawer: rainfall 0–140 mm, standing water 0–72 h, depth 0–35 cm, drainage (poor/moderate/good), crop stage selector; 4 presets (Severe Flood → CRITICAL, Heavy Waterlog → HIGH, Moderate Pool → MODERATE, Drained → NORMAL).
- Applied via `POST /api/incidents/:id/reassess` with `simParams`; simulated evidence tagged `source: 'simulation'`, `reliability: 'simulated'`; `farmrescue:reassessed` event refreshes all open dashboards.
- Reset endpoint (`POST /api/simulation/reset`) restores baseline seed state.

## FR-15: Persistence & Reliability — **SHIPPED** *(new in v2.0)*
- **FR-15.1 Optional MongoDB persistence** (SHIPPED): enabled by `MONGODB_URI`; snapshot document (`farmrescue-state`, `schemaVersion: 1`) holding all farms + incidents.
- **FR-15.2 Hydrate-on-boot** (SHIPPED): store adopts remote snapshot before first use; empty DB → seed baseline persisted; unreachable DB → seed serves + background retry (exponential 2 s → 60 s cap).
- **FR-15.3 Write-behind** (SHIPPED): mutations mark dirty; debounced flush (~800 ms) coalesces writes; no flush before successful hydrate (no blind overwrites).
- **FR-15.4 Hydrate-race policy** (SHIPPED): user mutations landing during hydration win deliberately and are written back; seed never counts as a mutation.
- **FR-15.5 Status endpoint** (SHIPPED): `GET /api/system/persistence` → mode (`disabled | connecting | connected | degraded`), last write, last error, pending flush, incident count.
- **FR-15.6 Zero-dependency driver** (SHIPPED): in-repo MongoDB wire client (`src/lib/mongo/`) — TLS, SRV discovery, SCRAM-SHA-256 with SHA-1 fallback negotiation, reconnect-with-backoff, OP_MSG.

## FR-16: Security & Multi-Tenancy — **PLANNED** *(new in v2.0)*
- Role-based auth on all API routes (roles already modeled: `FARMER | FIELD_WORKER | FPO_ADMIN | SYSTEM_ADMIN`).
- Farmer onboarding, multiple farms per account, per-FPO data isolation.

## FR-17: Notifications — **PLANNED** *(carried over from v1.0 as deferred)*
- SMS / WhatsApp / IVR delivery of escalations behind a domain adapter boundary.

---

# 3. Non-Functional Requirements

| NFR | Requirement | Status |
|---|---|---|
| NFR-01 Zero-failure explanation | Farmer always receives plan + explanation | SHIPPED (deterministic fallback) |
| NFR-02 Plan latency | Immediate on assessment (no generation step) | SHIPPED (pre-stored library) |
| NFR-03 Durability | Survives full server restart | SHIPPED & verified end-to-end |
| NFR-04 Graceful degradation | Every external dep degrades without UX failure; degradation visible | SHIPPED (`source`, freshness badges, status endpoint) |
| NFR-05 Auditability | Append-only assessments, actor-attributed timeline | SHIPPED |
| NFR-06 Determinism | Same inputs → same outputs | SHIPPED |
| NFR-07 Test coverage | Unit tests for rules/safety gate/library coverage | NOT STARTED (PRD §14.1) |
| NFR-08 Auth | Credentialed API | NOT STARTED (FR-16) |

---

# 4. Environment & Configuration

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | No (recommended) | Enables durable persistence; absent → in-memory seed store |
| `GEMINI_API_KEY` | No | Enables live Gemini explanations; absent → deterministic fallback |
| `GEMINI_MODEL` | No | Override model (default `gemini-3.8-flash`) |

All optional by design: the app is fully functional with zero configuration (seed data, deterministic plans and explanations, in-memory store).

---

# 5. Acceptance Criteria (Current Milestone)

1. Reporting any of the 6 incident types returns a complete action plan instantly. ✅
2. Every reachable `ruleFamily::riskLevel` combination resolves to a stored plan. ✅ (verified live)
3. Adding evidence triggers reassessment; history shows both versions. ✅
4. HIGH/CRITICAL incidents appear in the field-worker queue and can be verified with severity override. ✅
5. Simulator presets reproduce the four reference severities deterministically. ✅
6. With `GEMINI_API_KEY` set, explanation `source` = `ai_adapter_gemini`; without it, `deterministic_fallback` renders completely. ✅ (verified live)
7. With `MONGODB_URI` set, create → restart → data survives; without it, app runs in-memory without errors. ✅ (verified live)
8. `GET /api/system/persistence` reports truthful status in all modes. ✅
