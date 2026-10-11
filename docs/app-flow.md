# FarmRescue — App Flow

**Project:** FarmRescue 🌾
**Core Question:** *"What should I do when the farm suddenly goes wrong?"*
**Version:** 1.1
**Status:** Product Flow Specification — updated to match the implemented system (September 2026)
**Companion docs:** [`prd.md`](prd.md) (features & specs) · [`architecture.md`](architecture.md) (system design) · [`trd.md`](trd.md) (technical requirements)

---

# 1. Product Flow Philosophy

FarmRescue is not designed as a generic agricultural chatbot.

The primary experience is:

```text
Something went wrong
        ↓
Tell FarmRescue
        ↓
Understand the situation          ← pre-stored plan appears instantly
        ↓
Check evidence                    ← traceable, freshness-badged
        ↓
Assess risk                       ← deterministic versioned rules
        ↓
Tell me what to do NOW
        ↓
Monitor
        ↓
Reassess                          ← append-only, user/event-driven
        ↓
Resolve
```

The application always prioritizes **action over information overload**.

---

# 2. User Roles

As modeled in `src/types/index.ts` (`UserRole`). No auth yet — roles are implicit in the UI (PRD §14.3).

| Role | Role in the flow |
|---|---|
| **FARMER** | Reports incidents, reviews action plans, adds ground measurements, runs the simulator, submits resolution & outcome feedback |
| **FIELD_WORKER** | Verifies escalated incidents, provides ground truth, may override severity |
| **FPO_ADMIN** | Referenced in escalation content (community drainage, pump/seed logistics); dashboard planned |
| **SYSTEM_ADMIN** | Inspects system health via `GET /api/system/persistence` |

---

# 3. Primary Screens & Navigation

| Screen | Route | Purpose |
|---|---|---|
| Farmer Dashboard | `/` | Farm status, weather, active incidents with severity badges, emergency CTA |
| Incident Wizard | `/incidents/new` | Fast reporting (type → symptoms → confirm evidence → assess) |
| Action Screen (core) | `/incidents/:id` | DO NOW / DO NEXT / AVOID / MONITOR / ESCALATE + WHY panel, evidence view, reassessment, resolution |
| Field Worker Queue | `/field-worker` | Verification queue + ground-truth form |
| Auditable History | `/history` | Full timeline, non-destructive assessment history |

Cross-screen liveness: reassessment actions (evidence added, simulator applied, reset) broadcast a `farmrescue:reassessed` window event; every open dashboard listening for it refetches immediately.

---

# 4. Flow 1 — Report a Problem (Farmer)

```text
1. Farmer taps "🚨 Report a Problem Now" (dashboard CTA)
2. Selects incident type (icon chips):
   Waterlogging · Heavy Rain · Heat Stress · Pest · Disease · Something Else
3. Taps quick symptom chips (e.g. "Water standing > 15 cm",
   "Growing tips submerged"); adds duration / water depth; optional start time
4. Evidence confirmation screen — "Let's check what we know" — shows the
   environmental context the system already has (live weather / fallback model)
5. Submit → POST /api/incidents
6. Server (in one request, no waiting screens):
   evidence assembled → Risk Engine (versioned rule) → Safety Gate
   → pre-stored Action Plan lookup (ruleFamily::riskLevel)
7. Redirect to Action Screen — plan is already complete
   (default standing water 12 h / 10 cm is assumed when farmer omitted them)
```

**Determinism guarantee:** the same inputs always produce the same risk level and the same stored plan — plans are pre-stored content, not generated.

---

# 5. Flow 2 — Act on an Incident (Action Screen)

The screen is divided into:

- **DO NOW** — immediate physical interventions for the current severity.
- **DO NEXT** — follow-up steps once the acute phase passes.
- **AVOID** — harm-prevention rules (safety-gate enforced, e.g. no urea into flood water).
- **MONITOR** — specific symptoms + cadence to watch.
- **GET HELP / ESCALATION** — who has been alerted (field worker / FPO / district officer).
- **WHY THIS RECOMMENDATION** — expandable explanation; `source` shows whether Gemini (`ai_adapter_gemini`) or the deterministic fallback authored it.
- **Evidence View** — every assessment's inputs with source, reliability, and freshness (🟢 Fresh / 🟡 Aging / 🔴 Stale).

**Review deadline:** each assessment displays a `reviewAt` time (+3 h CRITICAL / +6 h HIGH / +12 h otherwise). *Note: this is informational — nothing re-runs automatically at that time (PRD §14.4).*

---

# 6. Flow 3 — Reassess (Dynamic & Append-Only)

Reassessment is **event/user-driven only** — there is no background scheduler. Triggers:

| Trigger | Path | Effect |
|---|---|---|
| Farmer adds a ground measurement (e.g. "water dropped to 4 cm") | `POST /api/incidents/:id/evidence` | New evidence item → automatic reassessment → plan may change |
| Simulator applied | `POST /api/incidents/:id/reassess` with `simParams` | Simulated evidence swaps in (tagged `simulated`), farm drainage/stage overridden for the run |
| Baseline reset | `POST /api/simulation/reset` | Store re-seeded to the baseline state |

Each reassessment:
1. Re-runs the risk engine on current evidence → new `RiskAssessment` (new `ruleVersion` stamp).
2. Safety gate revalidates → plan refreshed from the pre-stored library.
3. **Appends** the new assessment to `assessmentsHistory`; timeline logs the transition (`Risk level shifted from X → Y`); nothing is overwritten.
4. Marks state dirty → debounced (~800 ms) MongoDB write-behind.
5. Broadcasts `farmrescue:reassessed` → open dashboards refresh live.

If MongoDB is unreachable, steps 1–5 still complete in memory; the write retries in the background (PRD §10).

---

# 7. Flow 4 — Field Worker Verification

```text
1. HIGH/CRITICAL assessments auto-escalate → incident appears in /field-worker
   queue (with distance indicator). INSUFFICIENT/CONFLICTING evidence also
   forces escalation (Safety Gate).
2. Worker opens incident: sees plan, evidence trail, and full timeline.
3. Submits verification form:
   status: CONFIRMED · PARTIALLY_CONFIRMED · NOT_CONFIRMED · NEEDS_MORE_INFORMATION
   observation (ground truth), verifiedSeverity (optional override), notes
4. Incident status → VERIFIED; severity override (if any) applied;
   timeline records worker, observation, and decision.
```

---

# 8. Flow 5 — Resolve & Learn

```text
1. Farmer submits Resolution & Outcome form on the action screen:
   situationImproved (yes/partially/no) · actionsHelpful (yes/partially/no)
   observedDamage · cropCondition · farmerFeedback
2. Incident status → RESOLVED; severity → NORMAL;
   timeline closes the loop with the farmer's own words.
3. Outcome is preserved for future calibration (roadmap: outcome learning loop).
```

---

# 9. Flow 6 — Scenario Testing Lab (Simulation Drawer)

For reviewers and field agronomists on the action screen:

```text
1. Open "⚡ Field Scenario Simulator" drawer
2. Optional quick presets:
   ⛈️ Severe Flood (115mm/48h/25cm, poor) → CRITICAL
   🌧️ Heavy Waterlog (82/24/18, poor)     → HIGH
   🌦️ Moderate Pool (35/8/8, moderate)    → MODERATE
   ☀️ Drained/Normal (5/0/2, good)        → NORMAL
3. Or drag sliders: rainfall 0–140 mm · standing water 0–72 h · depth 0–35 cm
   · drainage (poor/moderate/good) · crop stage (seedling → ripening)
4. "Apply & Reassess" → Flow 3 (simulator path) → severity badge updates live
5. "Reset Initial State" restores the baseline seed data
```

Simulated evidence is always tagged `source: 'simulation'`, `reliability: 'simulated'` — **SIMULATED DATA** is never presented as ground truth.

---

# 10. Incident Status Lifecycle (as implemented)

```text
ACTION_REQUIRED ──(worker verification)──► VERIFIED ──(outcome form)──► RESOLVED
```

The type system also defines `DETECTED`, `ASSESSING`, `NOTIFIED`, `MONITORING` for a future automated pipeline (e.g. weather-triggered detection and notification) — currently no flow produces them (PRD §14.6).

---

# 11. Degradation Behavior in Flows

| Condition | What the farmer sees |
|---|---|
| Open-Meteo unreachable | Dashboard shows calibrated climate-model values (source labeled `fallback_climate_model`) |
| Gemini unconfigured/failing | "WHY" panel renders the complete deterministic explanation (`source: deterministic_fallback`) — identical layout, no error state |
| MongoDB unreachable | App fully usable in memory; status endpoint reports `degraded`; writes retry in background |
| Zero evidence on a report | Safety Gate flags `INSUFFICIENT` and forces escalation instead of guessing |
