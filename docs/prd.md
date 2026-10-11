# FarmRescue — Product Requirements Document (PRD)

**Project:** FarmRescue 🌾
**Product Promise:** *"What should I do when the farm suddenly goes wrong?"*
**Document:** Product Requirements Document (PRD)
**Version:** 2.1
**Status:** Living specification — reflects the implemented system as of September 2026
**Context:** Production-track platform for smallholder rain-fed and canal-irrigated farming; primary crop focus is Paddy (Kharif, Andhra Pradesh Krishna delta region), designed to extend to other crops and states
**Companion docs:** [`architecture.md`](architecture.md) (system design) · [`trd.md`](trd.md) (technical requirements) · [`app-flow.md`](app-flow.md) (UX flows)

---

## 1. Overview

### 1.1 Problem Statement

When an extreme event hits a smallholder farm — a cloudburst flooding a paddy field, a heat wave during flowering, a pest outbreak — the farmer faces a *time-critical decision gap*: hours matter, expert help is distant, and generic advice (or a chatbot's guess) can be wrong in ways that destroy yield. Fertilizer spread into floodwater is lost entirely. A pesticide sprayed before rain poisons waterways. A field uprooted "to be safe" may have been recoverable from lower nodes.

The structural reality behind this gap: the majority of cultivated holdings are small or marginal, the ratio of extension officers to farmers is extremely low, and the advisory channels that do exist (call centers, generic apps, word of mouth, fertilizer-dealer counters) have no visibility into the specific field's crop stage, soil, drainage, or live weather — so their advice is generic by construction. When that advice is wrong at the wrong moment, the loss is concentrated on the household least able to absorb it: a failed paddy stand means the season's primary income, seed, and input investment are gone together. FarmRescue is built for that exact window — the hours between "something has gone wrong" and "an expert can physically reach the field."

### 1.2 Product Promise

FarmRescue answers one question, fast and defensibly:

> **"What should I do when the farm suddenly goes wrong?"**

It converts a farmer's report plus live environmental data into an **instant, pre-stored, expert-authored action plan** (DO NOW / DO NEXT / AVOID / MONITOR / ESCALATE), explains *why* in farmer-friendly language (AI-assisted, human-decided), routes high-risk cases to a human field worker, and keeps a complete auditable history of every decision.

### 1.3 The Non-Negotiable Invariant

Every feature in this document serves one architectural rule:

> **Data and validated agricultural rules determine risk and allowed actions. AI explains validated results; AI does not independently decide what a farmer should do.**

Concretely: recommendations come from a **pre-stored library** of expert plans (Section 6), selected deterministically by the Risk Engine (Section 5). Gemini only *explains* the plan it is handed — it cannot alter the assessment, invent weather facts, or introduce new actions. If AI is unavailable, the farmer still gets a complete answer (Section 8).

### 1.4 Design Priorities

1. **Speed of first action** — a plan is on screen the moment an incident is assessed (pre-stored content, zero generation latency).
2. **Action over information overload** — the UI leads with DO NOW, not with data dashboards.
3. **Traceability** — every risk level is explained by named evidence items with source, strength, and freshness.
4. **Fail-safe degradation** — every external dependency (weather API, AI, database) has a graceful fallback; the farmer-facing answer never fails outright.
5. **Auditable evolution** — reassessments append new assessment versions; history is never overwritten.

### 1.5 Deployment & Operating Model

FarmRescue is designed to be deployed through the institutions that already reach farmers, rather than expecting individual downloads:

- **Extension networks** — field officers and KVK (Krishi Vigyan Kendra) staff use the Field Worker Queue (`/field-worker`) as their daily triage surface: every HIGH/CRITICAL assessment lands in a prioritized queue with distance indicators and a structured ground-truth verification form.
- **FPO cooperatives** — Farmer Producer Organizations get community-level visibility: escalation plans already name FPO coordinators for shared resources (community drainage canals, pump support, coordinated seedling nurseries), and the roadmap adds FPO-level dashboards.
- **State agriculture departments** — the escalation ledger, verification records, and outcome data form a defensible audit trail for scheme-linked compensation review and district-level advisory planning.
- **Low-bandwidth channels (roadmap)** — SMS/WhatsApp delivery of the action plan so the farmer does not need the app open in the field; the deterministic core means a plan can be rendered as plain text without any generation step.
- **Data ownership** — farms, incidents, and evidence belong to the deployment (state/FPO/private operator), not the platform; the single-snapshot MongoDB model exports cleanly, and no farmer data trains any model.

### 1.6 Success Metrics (pilot KPIs)

The pilot is instrumented — every metric below is computable from data FarmRescue already persists:

| Metric | Definition | Source |
|---|---|---|
| **Time-to-first-action** | Incident reported → plan on screen. Target: < 5 s (deterministic, no generation step) | `Incident.createdAt` vs assessment timestamp |
| **Verification SLA** | % of HIGH/CRITICAL incidents field-verified within `reviewAt` (3 h / 6 h) | `VerificationRecord.verifiedAt` vs `RiskAssessment.reviewAt` |
| **Escalation accuracy** | % of escalated incidents where field verification confirms or partially confirms the assessment | `VerificationRecord.status` distribution |
| **Outcome efficacy** | % of resolved incidents where the farmer reports `situationImproved = yes` and `actionsHelpful = yes` | `IncidentOutcome` |
| **Return engagement** | Farmers who report a second incident after resolving the first (proxy for trust) | incident history per farm |
| **Advisory safety** | Zero farmer-facing plans containing contraindicated actions (safety-gate intercepts + audit review) | `safetyWarnings` + timeline audit |

---

## 2. Users & Roles

Roles are modeled in `src/types/index.ts` (`UserRole`). Auth is **not yet implemented** (see Section 14); role is currently implicit in the UI.

| Role | Today's capabilities | Screen(s) |
|---|---|---|
| **FARMER** | Report an incident; view farm status, weather, active incidents; follow the action plan; add ground measurements (evidence); run the scenario simulator; submit resolution & outcome feedback | `/`, `/incidents/new`, `/incidents/:id`, `/history` |
| **FIELD_WORKER** | See a queue of incidents flagged for verification (with distance indicator); submit ground-truth verification (confirm / partially confirm / not confirmed / needs more info) and optionally override severity | `/field-worker` |
| **FPO_ADMIN** | (Planned role; today represented in escalation text — community drainage canal coordination, pump support, seed/nursery logistics) | — |
| **SYSTEM_ADMIN** | Inspect persistence/health status via the system API | `GET /api/system/persistence` |

**Reference personas (pilot region):**
- *Krishna Reddy* — farmer, 2.8-acre paddy field ("Vemuru Riverbed Field", BPT 5204 / Samba Mahsuri, tillering stage, clay loam, poor drainage), facing monsoon waterlogging.
- *Ramesh Kumar* — agricultural field officer who verifies high-risk incidents.

---

## 3. Core Principles

| # | Principle | Where it lives in code |
|---|---|---|
| P1 | **Evidence first** — every assessment is traceable to structured evidence with source, strength, and freshness | `src/domain/evidence/freshness.ts`, Evidence view on `/incidents/:id` |
| P2 | **AI second (subordinate)** — LLM sits *after* the deterministic risk + safety layers; it may never alter or override classifications | `src/domain/ai/adapter.ts` (strict prompt boundary), `src/domain/actions/recommendations.ts` |
| P3 | **Deterministic decisions, pre-stored content** — plans come from a versioned library keyed by `ruleFamily::riskLevel`; same inputs → same plan, every time | `src/domain/risk/rules.ts`, `src/domain/actions/recommendations.ts` |
| P4 | **Data freshness is first-class** — every observation carries `observedAt`, `retrievedAt`, `freshnessMinutes`, `strength`, `reliability`; staleness is surfaced, not hidden (🟢 Fresh / 🟡 Aging / 🔴 Stale) | `EvidenceItem` type, freshness engine |
| P5 | **Recommendations are time-bounded** — every assessment carries a `reviewAt` deadline (3h CRITICAL / 6h HIGH / 12h otherwise) | `evaluateRisk()` |
| P6 | **Human escalation** — HIGH/CRITICAL auto-escalates to the field-worker queue; insufficient or conflicting evidence forces escalation | `src/domain/safety/safetyGate.ts` |
| P7 | **Non-destructive history** — reassessments append; the timeline preserves every version and outcome | `Incident.assessmentsHistory`, `Incident.timeline`, `/history` |

---

## 4. Feature Inventory (Shipped)

All features below are **implemented and verified** unless explicitly marked otherwise.

### 4.1 Farmer Dashboard (`/`)
- Live environmental conditions for the pilot farm: 24h rainfall, temperature, humidity, wind — served by the weather adapter (Open-Meteo, 15-min cache) with a calibrated agro-climatic fallback when offline (`source: open_meteo_live | fallback_climate_model`).
- Active incident cards with real-time severity badges (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`) and rule version.
- Prominent emergency CTA: *"🚨 Something wrong with your farm right now? [Report a Problem Now]"*.
- Cross-page live refresh: simulator and reassessment actions broadcast a `farmrescue:reassessed` browser event; all dashboards listening on the page refetch.

### 4.2 Incident Reporting Wizard (`/incidents/new`)
- Non-academic, icon-driven incident type selection: **Waterlogging, Heavy Rain, Heat Stress, Pest, Disease, Something Else**.
- Quick symptom chips (e.g. *"Water standing > 15 cm"*, *"Growing tips submerged"*) that populate structured inputs.
- Duration / standing-water inputs; optional start time.
- Pre-assessment **evidence confirmation screen** (*"Let's check what we know"*) before the risk engine runs — sets the expectation that the system already knows weather context.
- On submit: `POST /api/incidents` → deterministic assessment + safety gate + pre-stored plan are computed server-side and returned (201).

### 4.3 Incident Response & Action Screen (`/incidents/:id`) — the core UI
- **DO NOW** — immediate physical interventions, pre-stored per risk level (e.g. *"Cut emergency breaches in field bunds at the lowest corners"*).
- **DO NEXT** — follow-up steps once the acute phase passes (e.g. foliar 1% urea + 1% KCl spray *after* water recedes below 5 cm).
- **AVOID** — harm-prevention rules (e.g. *"DO NOT apply granular urea into standing flood water"*, *"DO NOT spray contact pesticides while flood water remains"*).
- **MONITOR** — specific symptoms and thresholds to watch, with cadence (e.g. *"Check water depth at central peg every 2 hours until below 10 cm"*).
- **ESCALATE** — who has been alerted and what community-level support is invoked (field worker, FPO coordinator, district officer).
- **WHY THIS RECOMMENDATION?** — AI explanation panel fed only validated facts; shows `summary`, `why[]`, `doNowExplanation[]`, `avoidExplanation[]`, `watchFor[]`, `escalationNotice`, and an honest `source` of either `ai_adapter_gemini` or `deterministic_fallback`.
- **Evidence View** — traceability cards: source, value, reliability (`verified | reported | simulated | stale`), strength, and freshness indicator (`🟢 Fresh ≤30 min`, `🟡 Aging ≤3 h`, `🔴 Stale ≤24 h`, `UNAVAILABLE >24 h`).
- **Dynamic Reassessment** — add new ground measurements (e.g. *"water dropped to 4 cm"*) via the evidence form; the risk engine recalculates and the plan swaps instantly; every version is appended to history.
- **Resolution & Outcome Form** — post-incident feedback: situation improved? actions helpful? observed damage, crop condition, farmer feedback. Marks the incident RESOLVED.
- **Scenario Simulator drawer** (see 4.6).

### 4.4 Field Worker & Extension Queue (`/field-worker`)
- Queue of incidents flagged for verification (all HIGH/CRITICAL assessments auto-escalate; INSUFFICIENT/CONFLICTING evidence forces escalation).
- Distance indicator per incident.
- Ground-truth verification form: `CONFIRMED | PARTIALLY_CONFIRMED | NOT_CONFIRMED | NEEDS_MORE_INFORMATION`, free-text observation, **verified severity override**, official notes. Submission is appended to the incident timeline and, when a severity override is given, updates the incident severity.

### 4.5 Auditable History (`/history`)
- Complete incident timeline: every status change, evidence addition, assessment, verification, and resolution — with actor attribution.
- Non-destructive: every reassessment appends a new `RiskAssessment` to `assessmentsHistory`; nothing is overwritten.

### 4.6 Scenario Testing & Simulation Lab (drawer on `/incidents/:id`)
Interactive stress-testing of the deterministic engine, clearly labeled as simulated data:
- **Sliders:** 24h rainfall 0–140 mm (step 5) · standing-water duration 0–72 h (step 2) · water depth 0–35 cm (step 1).
- **Toggles:** field drainage (`poor | moderate | good`) · crop stage (seedling → ripening).
- **Presets:** ⛈️ Severe Flood (115 mm, 48 h, 25 cm, poor → CRITICAL) · 🌧️ Heavy Waterlog (82/24/18, poor → HIGH) · 🌦️ Moderate Pool (35/8/8, moderate → MODERATE) · ☀️ Drained/Normal (5/0/2, good → NORMAL).
- **Apply & Reassess** posts `simParams` to `POST /api/incidents/:id/reassess`; simulated evidence items are tagged `source: 'simulation'`, `reliability: 'simulated'` so simulated data never masquerades as ground truth.
- **Reset Baseline State** (`POST /api/simulation/reset`) restores the seed farm + reference incident.

### 4.7 Field Intelligence — Map, Location & Field Context (⚠ Disabled in the current release)

> **Status change (current release):** the `/field` and `/plots` UIs are disabled and their code parked in `src/_parked/` (restore steps in that folder's header). The backing APIs (`/api/fields*`, geocoding, weather/soil bundles) remain live. Reasons: the Plot Registry could only surface plots registered inside FarmRescue — with no government land-records verification, arbitrary real villages/khasras always returned "0 plots match"; and multiple simultaneously-running dev servers against one MongoDB snapshot clobbered each other's writes (registered plots vanished). To be revisited with a real land-records API (Bhulekh/ULPIN-style) and single-writer data ownership. Everything below describes the parked implementation.

### 4.7a Parked: Field Intelligence — Map, Location & Field Context (implemented, UI disabled)
- **Interactive field map** (`/field`): satellite-**default** slippy map built in-repo (zero map-library dependencies; Esri World Imagery + OSM tiles), [Map] [Satellite] [Hybrid] switching, pan/zoom/touch, GPS button (denial falls back gracefully with a message), tap-to-pin, move-pin, and optional **user-marked field boundary** polygon (tap points → close; area computed, labeled "not survey-grade"). Imagery is explicitly footnoted "not real-time"; poor-imagery fallback UX directs to GPS/manual pin.
- **Location search**: debounced village/town/landmark search via a **server-side geocoding proxy** (`GET /api/geo/search` — Nominatim with identifying User-Agent, 6 s timeout, fails soft). Search moves the map; it never auto-claims the field — the farmer confirms.
- **Server-validated field persistence**: `POST /api/fields` validates coordinates/boundary server-side (client never trusted), stores `locationSource` (`GPS | SEARCH | MANUAL_PIN`), accuracy meters, capture time. Fields survive restarts via the existing MongoDB snapshot (verified).
- **Weather bundle** (`GET /api/fields/:id/weather`): current conditions (**OBSERVED**), 5-day forecast (**FORECAST** — never shown as observed), 7-day rainfall history (**OBSERVED**, today/yesterday/7-day totals). One upstream Open-Meteo call serves all three; provider failure degrades to a clearly labeled model estimate (`degraded: true`).
- **Soil report** (`GET /api/fields/:id/soil`): deterministic **REGIONAL / MODELLED** estimate (pH, clay/sand/silt, organic carbon, CEC) with provenance-first UI and a permanent "⚠️ not a field laboratory test" disclaimer. Unknown is a valid state; soil characteristics are never conflated with soil moisture.
- **Field-condition reporting** (`POST /api/fields/:id/observations`): dry / normal / wet / standing water / waterlogged / **I don't know** + optional water depth + drainage. Stored as `FieldObservation` and emitted as REPORTED evidence for the risk engine; timestamps and evidence IDs are server-assigned.
- **Evidence quality pipeline** (`src/domain/field/context.ts`): raw → normalize → validate (implausible values rejected) → freshness → source classification → verdict (**STRONG / MODERATE / LIMITED / UNKNOWN**) with human-readable reasons ("✓ recent observation", "⚠️ regional/modelled", "⚠️ forecast (not an observation)"). No fake confidence percentages anywhere.
- **Insufficient-evidence safety language** (`POST /api/fields/:id/incidents`): water-type incidents with an unconfirmed field condition still create the incident (with all attached field evidence) but return `insufficientEvidence: true` + requested checks (standing water / drainage / soil saturation) — the UI shows "INSUFFICIENT FIELD EVIDENCE" instead of a strong claim.

### 4.8 Persistence & Reliability (Shipped)
- **MongoDB persistence** (optional, enabled by `MONGODB_URI`): hydrate-on-boot, debounced write-behind (~800 ms after any mutation), graceful degraded mode with exponential background retry (2 s → 60 s cap) if the database is unreachable — the app never blocks on the DB and never serves a broken request because of it.
- **Restart-survival verified**: create incident → flush → kill server → relaunch → data returns from MongoDB.
- **Live status endpoint** `GET /api/system/persistence` reports `mode` (`disabled | connecting | connected | degraded`), last write time, last error, pending flush, hydration state, and incident count.
- Zero-dependency MongoDB driver built in-repo (TLS, SRV discovery, SCRAM-SHA-256 with SHA-1 fallback negotiation, reconnect-with-backoff, OP_MSG wire protocol) — no external driver dependency.

### 4.9 Parked: Plot Registry — Land-Record Lookup & Map (`/plots`, implemented, UI disabled — see 4.7 status note)
- **Cascading land-record lookup**: **State → District → Tahsil/Mandal → Panchayat → Village (gaon) → Khasra/plot no.** Each level is a datalist-backed input — bundled options where the reference dataset covers the region, free text everywhere else (unknown divisions are valid input and never block the user). Changing a parent clears deeper levels (cascade semantics); deeper levels stay disabled until their parent is set.
- **Bundled admin-division dataset** (`src/lib/admin/divisions.ts`): all 36 states/UTs; district lists for Andhra Pradesh, Chhattisgarh, Telangana; deep tahsil→panchayat→village chains for the reference talukas (e.g. Bapatla → Vemuru → Vemuru panchayat). Helpers: `divisionOptions(level, sel)`, `describeSelection(sel)`, `ADMIN_LEVELS`, `ADMIN_LABELS`.
- **Matching** (`src/lib/admin/plotRegistry.ts`): hierarchy levels match exact case-insensitive; an unset level imposes no constraint; khasra matches as a substring ("42" finds "42/1B"). Filtering runs client-side over `GET /api/fields` — instant with the current dataset size.
- **Map integration**: matches render on the field map as chips with dashed boundary polygons; a selected plot turns emerald and the map recenters on it without disturbing the selection pin; a **single match auto-selects**, so the details card and map position load together with no extra click.
- **Details card**: land record (khasra no., village / tahsil / panchayat / district / state, area — boundary-derived or recorded, coordinates) plus crop & field profile; `DEMO DATA` badge on SEEDED plots; deep link into Field Intelligence (`/field?plot=<id>`, honored by the field page).
- **Nearest plot to me**: GPS fix finds the closest registered plot (straight-line distance, honestly labeled) and auto-fills the whole cascade.
- **Zero-match → register on the spot**: when a lookup finds nothing, the empty state explains that the registry only contains plots registered inside FarmRescue and offers **"Register this plot here"** — the farmer taps the plot's location on the satellite map (tap-to-pin, optional drawn boundary), and the page POSTs the searched hierarchy + khasra with the pin's coordinates; the server validates and stores it as REGISTERED, after which every matching lookup finds it.
- **Honest name checking, not a gate**: each typed level shows a live hint — `✓ In reference list` when the bundled dataset covers it, `⚠ Not in the bundled list — will be saved exactly as typed` when the parent chain is bundled but the name is unknown, and nothing when no reference data covers that chain (unchecked ≠ wrong). No spelling is ever rejected; real land-record spellings are countless and the bundle covers only the reference regions.
- **Bhuiyan-style khasra report details** (`Farm.officialRecord`): the details card offers a khasra-report section where the farmer copies खातेदार / landholder, रकबा / area (+unit), किस्म / land type, and co-holders from the official portal record (e.g. CG Bhuiyan `Selection_Report_For_KhasraDetail.aspx`). Stored with explicit provenance ("farmer-entered from the official khasra report — not server-verified", portal + date); `officialRecord: null` on PATCH clears it. For Chhattisgarh plots the card links directly into the CG Bhuiyan khasra report flow (जिला → तहसील → ग्राम → खसरा).
- **Data model**: farms ARE the plot records — `Farm.khasraNo?`, `Farm.recordSource: 'SEEDED' | 'REGISTERED'`; `LocationCoordinates` gains `tahsil?` / `panchayat?`. Three SEEDED demo plots (Vemuru khasra 42/1B & 43; Abhanpur khasra 7/2) re-seed automatically after hydration if missing; plots created via the API are REGISTERED. PATCH semantics: an empty string unsets a field.

---

## 5. Risk Engine Specification (as implemented)

Source of truth: `src/domain/risk/rules.ts`. All thresholds below are the *actual* shipped values.

### 5.1 Versioned Rules

| Rule family | Version constant | Guard |
|---|---|---|
| Paddy Waterlogging | `PADDY_WATERLOGGING_001-v1.2` | `farm.crop === 'paddy'` AND (explicit water incident OR ambient-routed `other`) |
| Heat Stress | `HEAT_STRESS_001-v1.0` | explicit `heat_stress` report OR ambient-routed `other` with temp ≥ 36 °C |
| Pest / Disease | `PEST_DISEASE_001-v1.0` | explicit `pest` or `disease` report |
| General Hazard | `GENERAL_HAZARD_001-v1.0` | fallback for everything else |

**Rule-priority policy (important):** an *explicitly reported* incident type always routes to its dedicated rule. Ambient environmental signals (heavy rain ≥ 40 mm/24 h, standing water ≥ 12 h, extreme heat ≥ 36 °C) only auto-route reports of type `other` — i.e. when the farmer reported a problem but couldn't classify it. This prevents, e.g., a heat-stress report from being hijacked into a waterlogging plan just because it rained recently. (Note: waterlogging remains paddy-guarded — see Known Gaps 14.2.)

### 5.2 Paddy Waterlogging — severity thresholds

Inputs read from evidence: `rainfall_24h`, `rainfall_forecast`, `standing_water_duration`, `standing_water_depth`.

| Severity | Condition (any of) | Escalation |
|---|---|---|
| **CRITICAL** | `rainfall ≥ 100 mm` **OR** (`rainfall ≥ 75 mm` AND `standing water ≥ 36 h`) — both require `drainage = poor` | ✅ Yes |
| **HIGH** | `rainfall ≥ 60 mm` **OR** (`rainfall ≥ 45 mm` AND forecast ≥ 30 mm) **OR** `standing water ≥ 24 h` **OR** `depth ≥ 15 cm` **OR** (`rainfall ≥ 50 mm` AND sensitive stage: tillering / panicle initiation / flowering) | ✅ Yes |
| **MODERATE** | `rainfall ≥ 30 mm` **OR** `standing water ≥ 8 h` | No |
| **LOW** | `rainfall ≥ 15 mm` **OR** any standing water > 0 h | No |
| **NORMAL** | otherwise | No |

### 5.3 Heat Stress — severity thresholds

| Severity | Condition | Escalation |
|---|---|---|
| **CRITICAL** | `temperature ≥ 40 °C` AND stage ∈ {flowering, panicle_initiation} (spikelet sterility risk) | ✅ Yes |
| **HIGH** | `temperature ≥ 38 °C` | ✅ Yes |
| **MODERATE** | `temperature ≥ 35 °C` | No |
| **LOW** | otherwise | No |

### 5.4 Pest / Disease

| Severity | Condition | Escalation |
|---|---|---|
| **HIGH** | observed leaf symptom evidence (`leaf_yellowing` or `pest_sighting`) AND (`rainfall > 30 mm` OR `temperature > 30 °C`) — post-moisture humidity drives outbreaks | ✅ Yes |
| **MODERATE** | symptoms reported, humidity driver absent | No |

Deliberate design: the engine never recommends a pesticide — it demands verified diagnosis before any spray decision.

### 5.5 Review cadence (time-bounded validity)

`reviewAt = assessedAt + { CRITICAL: 3 h, HIGH: 6 h, otherwise: 12 h }`

---

## 6. Pre-Stored Recommendation Library

Source of truth: `src/domain/actions/recommendations.ts` (resolved by `src/domain/actions/templates.ts`).

**Concept:** every `ruleFamily::riskLevel` combination the engine can emit maps to a complete, expert-authored action plan. The plan appears **instantly** on assessment — no generation step, no waiting, byte-identical every time the same conditions recur. Content is aligned with ICAR / IRRI paddy submergence, heat-stress, and IPM protocols.

### 6.1 Coverage Matrix (12 entries — full coverage of reachable combos)

| Rule family | CRITICAL | HIGH | MODERATE | LOW | NORMAL |
|---|---|---|---|---|---|
| **PADDY_WATERLOGGING** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **HEAT_STRESS** | ✅ | ✅ | ✅ | ✅ | ↘ fallback* |
| **PEST_DISEASE** | ↘ fallback* | ✅ | ✅ | ↘ fallback* | ↘ fallback* |
| **GENERAL_HAZARD** | ↘ fallback* | ↘ fallback* | ↘ fallback* | ↘ fallback* | ✅ |

\* Engine never emits these combos today (e.g. heat engine's minimum is LOW, pest's minimum is MODERATE); `getStoredRecommendation()` falls back to `GENERAL_HAZARD::NORMAL` so *every* possible lookup still returns a valid plan.

### 6.2 Plan anatomy

Each stored plan provides five arrays — `doNow[]`, `doNext[]`, `avoid[]`, `monitor[]`, `escalate[]` — assembled by `generateActionPlan()` into the full `ActionPlan` (with `why` composed from assessment rationale + evidence, `reviewAt`, `version`, timestamps). The Safety Gate (Section 7) validates the plan before it reaches the UI.

### 6.3 Representative content highlights

- **Waterlogging CRITICAL**: cut bund breaches at lowest corners; second outlet if > 20 cm; mechanical pump-out; node/tiller viability test at 4–5 days; re-transplant planning if submerged > 10–14 days; "do NOT uproot prematurely".
- **Waterlogging HIGH**: breach bunds; clear channels; foliar 1% urea + 1% KCl *after* water < 5 cm; BLB / Sheath Rot watch after drainage.
- **Heat CRITICAL**: maintain 5–7 cm standing water; midday sprinkler misting 11 AM–2 PM at flowering; evening irrigation; empty-spikelet sterility check.
- **Pest/Disease HIGH**: photo documentation; light/pheromone traps; spread marking; **verified diagnosis before any spray**; dry-window-only spraying rule.

---

## 7. Safety Gate

Source of truth: `src/domain/safety/safetyGate.ts`. Runs *after* the risk engine, *before* the plan reaches the UI.

| Check | Behavior |
|---|---|
| **Evidence sufficiency** | No evidence at all → `INSUFFICIENT` + forced escalation + warning |
| **Conflicting data** | `rainfall_24h = 0` while `standing_water_duration > 36 h` → `CONFLICTING` + forced escalation (flags canal overflow / irrigation malfunction) |
| **Chemical interception** | During HIGH/CRITICAL flooding, any `doNow` item mentioning urea/fertilizer is flagged and warned — *"Safety gate intercepted: Granular fertilizer top-dressing blocked during active flooding"* |
| **Escalation enforcement** | HIGH/CRITICAL always forces `escalationRequired = true` regardless of engine output |
| **Sufficiency verdict** | `SUFFICIENT | INSUFFICIENT | CONFLICTING` — surfaced for audit |

---

## 8. AI Explanation Layer (Gemini)

Source of truth: `src/domain/ai/adapter.ts`. Endpoint: `POST /api/incidents/:id/explain`.

### 8.1 Contract
- **Input to the model:** farm context (crop, variety, stage, soil, drainage), the deterministic assessment (level + rule version + rationale), the approved plan's `doNow/avoid/monitor`, and the validated evidence list — **nothing else**. The prompt explicitly forbids altering the assessment, inventing weather facts, and recommending chemical pesticides.
- **Output:** strict JSON (`responseMimeType: application/json`): `summary`, `why[]`, `doNowExplanation[]`, `avoidExplanation[]`, `watchFor[]`, `escalationNotice`.
- **Provenance:** every response carries `source: 'ai_adapter_gemini' | 'deterministic_fallback'` so the UI/user can always tell who authored the explanation.

### 8.2 Reliability design
- Model: `gemini-3.8-flash` default, overridable via `GEMINI_MODEL` env var.
- **Retry:** up to 4 attempts with linear backoff (2 s / 4 s / 6 s) on `429` / `5xx` / network errors; non-retryable 4xx (bad key, malformed request) bail immediately.
- **Zero-failure guarantee:** if AI is unconfigured, rate-limited, down, or returns unparseable output, `getDeterministicExplanation()` renders a complete explanation from the validated facts (evidence-driven `why`, plan-derived actions/cautions, escalation notice). The farmer **always** receives an answer.

### 8.3 What the AI layer is NOT
- Not a decision maker. Not persisted (re-fetched per view). Not a source of new recommendations. Not reachable without a preceding deterministic assessment.

---

## 9. Evidence Engine

Source of truth: `src/domain/evidence/freshness.ts` + the `EvidenceItem` type.

### 9.1 Evidence sources
`weather_provider` · `farmer_observation` · `field_worker` · `sensor` (modeled) · `simulation`

### 9.1a Evidence kinds & verdicts (Field Intelligence quality pipeline)
Every field-context item additionally carries a **kind** — `OBSERVED | FORECAST | MODELLED | REPORTED` — and a **verdict** with reasons: `STRONG | MODERATE | LIMITED | UNKNOWN`. Forecast data is always MODERATE at best and labeled; modelled soil is always LIMITED; unknown is explicitly listed, never guessed. No fabricated confidence numbers.

### 9.2 Evidence types (12)
`rainfall_24h` · `rainfall_forecast` · `standing_water_depth` · `standing_water_duration` · `temperature` · `humidity` · `soil_saturation` · `leaf_yellowing` · `lodging_plants` · `pest_sighting` · `farmer_note` · `field_worker_photo`

### 9.3 Freshness bands

| State | Freshness | UI indicator |
|---|---|---|
| FRESH | ≤ 30 min | 🟢 |
| AGING | ≤ 3 h | 🟡 |
| STALE | ≤ 24 h | 🔴 |
| UNAVAILABLE | > 24 h | (excluded) |

### 9.4 Strength classification
- **STRONG**: ≥ 2 strong sources (weather_provider / field_worker / simulation, each < 2 h fresh) **and** ≥ 1 farmer observation.
- **MODERATE**: ≥ 1 strong source, or ≥ 2 farmer observations.
- **WEAK**: anything less (including empty evidence).

Reliability tags: `verified | reported | simulated | stale`. Simulation data is always tagged and never presented as ground truth.

---

## 10. Data Persistence & Reliability

Source of truth: `src/lib/persistence/mongo.ts`, `src/lib/mongo/{client,bson}.ts`, `src/domain/store/index.ts`.

### 10.1 Storage model
- Single snapshot document (`_id: 'farmrescue-state'`, `schemaVersion: 1`) holding all farms + incidents, written with an atomic upsert. Domain objects are JSON-clean (ISO strings, no `Date` objects) so they round-trip BSON losslessly.
- Reads are always served from the in-memory store (zero-latency UX); MongoDB is the durable backing store.

### 10.2 Behavior guarantees

| Concern | Guarantee |
|---|---|
| **Boot** | Store hydrates from MongoDB before first use; empty DB → seed baseline is persisted promptly. Unreachable DB → seed data serves immediately; hydration retries in background. |
| **Writes** | Every mutation marks state dirty; a **debounced flush (~800 ms)** coalesces rapid mutations into one network write. |
| **DB down mid-run** | Mode → `degraded`; mutations stay in memory; exponential retry (2 s doubling, 60 s cap) rehydrates/reconnects without user impact. |
| **No blind writes** | A flush never runs before a successful hydrate — a failed read can never cause local data to overwrite an unknown remote baseline. |
| **Hydrate race** | If a user mutation lands while hydration is in flight (slow first compile, cold TLS), **local wins** deliberately (baseline is in hand; state is written back). Seed data never counts as a mutation. |
| **Dev-mode safety** | Store + persistence manager are cached on `globalThis` so Next.js dev HMR cannot split singletons across route bundles. |
| **Status** | `GET /api/system/persistence` → `{ mode, database, host, lastWriteAt, lastError, pendingFlush, hydrated, enabled, incidentCount, note }`. |

### 10.3 Verified durability
End-to-end proven against a live Atlas cluster: create → flush → hard-kill server → relaunch → data restored (`mode: connected`).

---

## 11. Data Model

All entities live in `src/types/index.ts`.

| Entity | Purpose | Key fields |
|---|---|---|
| **Farm** | Farm profile (and registry plot record) | id, owner (id/name/phone), name, `LocationCoordinates` (lat/lng + village/tahsil/panchayat/district/state/address), areaAcres, crop (`CropType` ×6), cropVariety, cropStage (`CropStage` ×8), sowingDate, soilType (×6), drainage (×4), waterSource, `khasraNo?`, `recordSource` (`SEEDED \| REGISTERED`), `officialRecord?` (farmer-entered khasra-report details: ownerName, areaText, landType, coOwners, sourcePortal, recordedAt) |
| **Incident** | Aggregate root | id, farmId, createdBy, type (×6), status (×7), severity (`RiskLevel`), title/description, startedAt/createdAt/updatedAt, `currentAssessment?`, `currentActionPlan?`, `verification?`, `outcome?`, `evidence[]`, `assessmentsHistory[]`, `timeline[]` |
| **EvidenceItem** | One observation | id, incidentId, source (×5), type (×12), value, unit, observedAt, retrievedAt, freshnessMinutes, strength (×5), reliability (×4), metadata? |
| **RiskAssessment** | One engine output version | id, incidentId, ruleVersion, riskLevel, evidenceStrength, contributingEvidence[], missingEvidence[], assessedAt, reviewAt, escalationRequired, rationale |
| **ActionPlan** | Validated plan | id, incidentId, assessmentId, doNow[], doNext[], avoid[], monitor[], escalate[], why, reviewAt, version, createdAt |
| **VerificationRecord** | Field-worker ground truth | id, incidentId, workerId, workerName, status (×4), observation, verifiedSeverity?, verifiedAt, notes |
| **IncidentOutcome** | Post-incident learning | id, incidentId, situationImproved (yes/partially/no), actionsHelpful (×3), observedDamage, cropCondition, farmerFeedback, fieldWorkerNotes?, resolvedAt |
| **TimelineEvent** | Audit trail entry | id, incidentId, timestamp, title, description, type (×6), badge?, actor? |
| **SimulationParams** | Simulator input | rainfall24h, forecastRainfall, standingWaterDepthCm, standingWaterHours, drainage, temperatureC, cropStage, soilType |
| **ExplanationResponse** | AI/fallback output | summary, why[], doNowExplanation[], avoidExplanation[], watchFor[], escalationNotice, **source** |

**Incident status lifecycle (as used today):** `ACTION_REQUIRED → VERIFIED → RESOLVED` (the enum also defines `DETECTED`, `ASSESSING`, `NOTIFIED`, `MONITORING` for future automated pipeline stages — see 14.4).

---

## 12. API Reference

All routes return `{ success: true, data }` or `{ success: false, error: { message } }`. No auth yet.

| # | Method & Path | Purpose | Notable behavior |
|---|---|---|---|
| 1 | `GET /api/farms` | List farms | — |
| 2 | `POST /api/farms` | Create/update a farm | Upsert by id |
| 3 | `GET /api/incidents` | List incidents | Newest first |
| 4 | `POST /api/incidents` | Report incident | Body: `{farmId?, type, description, standingWaterHours? (default 12), standingWaterDepthCm? (default 10)}` → full assessment + plan computed server-side; 201 |
| 5 | `GET /api/incidents/:id` | Incident detail | Returns `{incident, farm}` |
| 6 | `POST /api/incidents/:id/evidence` | Add ground evidence | `{type, value, unit?, source?, strength?, reliability?}` → auto-triggers reassessment; returns updated incident |
| 7 | `POST /api/incidents/:id/reassess` | Reassess | Optional `{simParams}` replaces/updates simulated evidence + farm drainage/stage (simulator path) |
| 8 | `POST /api/incidents/:id/verify` | Field-worker verification | `{status, observation, verifiedSeverity?, workerName?, notes?}` → sets status VERIFIED; severity override applied |
| 9 | `POST /api/incidents/:id/outcome` | Resolution & feedback | Marks RESOLVED, severity → NORMAL |
| 10 | `POST /api/incidents/:id/explain` | AI explanation | Gemini with deterministic fallback; response carries `source` |
| 11 | `GET /api/weather?lat&lng` | Live weather | Open-Meteo (15-min cache) with calibrated fallback |
| 12 | `POST /api/simulation/reset` | Reset baseline state | Re-seeds the baseline farm + reference waterlogging incident |
| 13 | `GET /api/system/persistence` | Persistence health | Waits (≤ 15 s) for hydration to settle, then reports definitive status |
| 14 | `GET /api/geo/search?q=` | Location search proxy | Server-side Nominatim (UA required), 6 s timeout, fails soft with empty list + note |
| 15 | `GET /api/fields` · `POST /api/fields` | List / create field | POST validates coords/boundary server-side; stores location provenance; accepts state→village hierarchy + `khasraNo` (trimmed, ≤120 chars) |
| 16 | `GET /api/fields/:id` · `PATCH` | Field detail + context bundle / update | GET returns field + weather + soil + evidence verdicts; PATCH recomputes boundary area server-side and accepts hierarchy/`khasraNo` (empty string unsets) |
| 17 | `GET /api/fields/:id/weather` | Weather bundle | Current (observed) + 5-day forecast + 7-day history; `degraded` flag when provider down |
| 18 | `GET /api/fields/:id/soil` | Soil report | REGIONAL/MODELLED with disclaimer; unknown-safe |
| 19 | `GET`/`POST /api/fields/:id/observations` | Field-condition observations | POST validates condition/depth, stores observation + REPORTED evidence |
| 20 | `GET /api/fields/:id/evidence` | Unified evidence view | All items with verdicts + reasons + explicit missing list |
| 21 | `POST /api/fields/:id/incidents` | Incident from field context | Attaches live field evidence; returns `insufficientEvidence` + `requestedChecks` when water condition unconfirmed on water incidents |

---

## 13. Non-Functional Requirements

| NFR | Requirement | Status |
|---|---|---|
| **Zero-failure answers** | A farmer must always receive a complete plan + explanation, regardless of AI/database/weather availability | ✅ Shipped (fallbacks at every layer) |
| **Latency of first plan** | Plan must render immediately on assessment — no generation step | ✅ Shipped (pre-stored library) |
| **Durability** | Data must survive full server restarts | ✅ Shipped & verified (MongoDB snapshot) |
| **Graceful degradation** | Every external dependency degrades without breaking UX; degradation is visible (status endpoint, `source` field, freshness badges) | ✅ Shipped |
| **Auditability** | Every assessment version, evidence item, verification, and outcome is preserved with actor + timestamp | ✅ Shipped (append-only history) |
| **Determinism** | Same evidence + farm context → same risk level + same stored plan | ✅ Shipped |
| **Safety** | Harmful agronomic actions are intercepted before display (fertilizer-during-flood rule; no AI-generated pesticide advice) | ✅ Shipped |
| **Test coverage** | Unit tests for risk rules, safety gate, library coverage | ❌ Not started (see 14.1) |
| **Auth / multi-tenancy** | Role-based access across farms | ❌ Not started (see 14.3) |

---

## 14. Known Gaps & Technical Debt (Honest List)

### 14.1 Test coverage is partial
A zero-dependency Node test suite (`npm test`, 31 tests) covers the admin-division cascade, plot-registry filtering, coordinate/polygon math, observed-vs-forecast labeling, soil provenance, and evidence verdicts. Still untested: `src/domain/risk/rules.ts` threshold boundaries, `src/domain/safety/safetyGate.ts` interception rules, and a library-coverage matrix assertion.

### 14.2 Coverage limits of the recommendation library
- Waterlogging plans are **paddy-only** (the waterlogging rule is paddy-guarded); other crops currently fall through to the generic plan.
- Heat / pest libraries only cover the severities the engine emits; `HEAT_STRESS::NORMAL`, `PEST_DISEASE::LOW`, etc. resolve to the generic fallback.

### 14.3 No authentication
Roles exist in the type system and UI, but API routes accept no credentials; the verification route hardcodes `workerId: 'worker-ramesh'`. Acceptable for the single-tenant pilot deployment; a blocker for multi-tenant production rollout.

### 14.4 "Next reassessment scheduled" label is display-only
The header text on the action screen suggests a scheduled future reassessment, but **no background scheduler exists** — reassessment happens only on explicit triggers (evidence added, simulator applied, reset). Either implement a timed review loop (honoring `reviewAt`) or soften the label.

### 14.5 Hardcoded evidence on incident creation
`createIncident` seeds a fixed **65 mm rainfall** reading for *every* new incident regardless of type, and the API defaults standing water to 12 h / 10 cm. This skews assessments for non-water incidents (mitigated by the rule-priority fix, but still synthetic) and should be replaced by live weather-adapter evidence.

### 14.6 Misc
- Verify/outcome routes fall back to pilot-friendly default values when fields are omitted.
- Simulator omits `excessive` drainage and `germination`/`harvest` stages.
- Notification service (SMS/WhatsApp/IVR) exists only in escalation *text*; no real delivery.
- Incident statuses `DETECTED`, `ASSESSING`, `NOTIFIED`, `MONITORING` are defined but not yet produced by any flow.
- Plot Registry name checking is **advisory only** — no verification against Bhulekh/ULPIN or any government land-records API; names not in the bundled reference list are stored exactly as typed. Plot coordinates come from user-placed map taps (or GPS), not cadastral survey data.

---

## 15. Roadmap

### P1 — Hardening (make the pilot deployment defensible)
1. **Extend the test suite** — risk-rule boundary values at every threshold, safety-gate interception rules, library coverage matrix (14.1).
2. **Real scheduled reassessment** honoring `reviewAt` — or honest removal of the schedule label (14.4).
3. **Live weather evidence on incident creation** — replace the hardcoded 65 mm with weather-adapter data per farm location (14.5).
4. **Basic auth** — farmer / field-worker / admin identity on API routes (14.3).

### P2 — Breadth (make it real for more farms)
5. **Multi-crop plans** — waterlogging library for wheat/maize/etc.; crop-specific heat and pest content (14.2).
6. **Photo evidence pipeline** — the `field_worker_photo` evidence type exists; wire capture → storage → verification UI.
7. **Notifications** — SMS/WhatsApp delivery of escalations (Twilio/WATI-class adapter behind the existing domain boundary).
8. **Localization** — Telugu-first farmer-facing strings; the AI layer already accepts a `language` parameter.

### P3 — Depth (make it a platform)
9. **Offline-first PWA** — cache plans and report queue for no-connectivity field conditions.
10. **Sensor/IoT intake** — the `sensor` evidence source is modeled; ingest water-level / soil-moisture probes with the existing freshness pipeline.
11. **Outcome learning loop** — aggregate `IncidentOutcome` data to calibrate thresholds and demonstrate plan efficacy to agronomists.
12. **Per-farm multi-tenancy** — farmer onboarding, multiple farms per account, FPO-level dashboards.
13. **Land-records integration** — verify khasra/panchayat/village against state Bhulekh/ULPIN-style APIs and prefill plot polygons from cadastral data (today name checking is advisory only — see 14.6; farmers currently self-enter khasra-report details with explicit provenance).

---

*This PRD reflects the code as of the MongoDB-persistence milestone (September 2026). Update Sections 5–12 whenever `rules.ts`, `recommendations.ts`, `adapter.ts`, `persistence/mongo.ts`, or the API routes change — those are the sources of truth.*
