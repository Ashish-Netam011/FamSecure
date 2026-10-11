# FarmRescue 🌾

**Emergency Agricultural Early-Warning and Response Platform**  
*“What should I do when the farm suddenly goes wrong?”*  

---

## 1. Architectural Philosophy

FarmRescue is built around one fundamental rule:

> **Data and validated agricultural rules determine risk and allowed actions.  
> AI explains validated results; AI does not independently decide what a farmer should do.**

```text
Data / Weather / Farmer Observations
                 ↓
      Normalized Evidence Engine
                 ↓
   Deterministic Risk Engine (Versioned Rules)
                 ↓
     Safety Gate (Evidence & Action Validation)
                 ↓
    Pre-Stored Action Plan Library (Do Now, Do Next,
                Avoid, Monitor, Escalate)
                 ↓
   Human-in-the-Loop Verification (Field Worker)
                 ↓
     AI Explanation Layer (Gemini Adapter)
                 ↓
    Farmer Dashboard & Emergency Action Screen
                 ↓
    Dynamic Reassessment & Auditable Outcomes
                 ↓
    MongoDB Persistence (hydrate-on-boot, write-behind)
```

---

## 2. Core Features (P0 MVP)

> **Disabled in the current release:** the **Field Map (`/field`)** and **Plot Registry (`/plots`)** features are disabled — the registry could only find plots registered inside FarmRescue (no government land-records verification), and simultaneous dev servers kept overwriting each other's data in the shared database. The full implementation (cascading State→Village→Khasra lookup, map chips, register-on-the-spot, Bhuiyan-style khasra report entry) is preserved in `src/_parked/` — see that folder's header comment for one-step restore. To be revisited with a real land-records API (Bhulekh/ULPIN-style).

- **Farmer Dashboard (`/`)**:
  - Live environmental conditions (24h rainfall, temperature, humidity, wind) powered by Open-Meteo with calibrated agro-climatic fallbacks.
  - Active incidents with real-time severity badges (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
  - Prominent emergency reporting CTA: *“🚨 Something wrong with your farm right now? [Report a Problem Now]”*.

- **Incident Reporting Wizard (`/incidents/new`)**:
  - Intuitive, non-academic reporting: Waterlogging, Heavy Rain, Heat Stress, Pest, Disease, or Something Else.
  - Quick symptom chips (e.g. *“Water standing > 15 cm”*, *“Growing tips submerged”*).
  - Pre-assessment evidence confirmation screen (*“Let's check what we know”*) before running the risk engine.

- **Incident Response & Hero Action Screen (`/incidents/:id`)**:
  - **DO NOW**: Clear step-by-step immediate physical interventions (e.g., cut drainage breaches at the lowest bund corner).
  - **AVOID**: Safety-gate intercepted harmful actions (e.g., *“DO NOT apply granular urea into standing flood water”*, *“DO NOT spray contact pesticides”*).
  - **MONITOR**: Key symptoms and submergence thresholds to watch for.
  - **WHY THIS RECOMMENDATION?**: Contextual explanation powered by the AI Adapter (Gemini with zero-failure deterministic fallback).
  - **Evidence View**: Traceability cards displaying source, reliability, and freshness indicators (`🟢 Fresh`, `🟡 Aging`, `🔴 Stale`).
  - **Dynamic Reassessment**: Add new ground measurements (e.g., water level dropped to 4cm) and see live recalculation.
  - **Resolution & Outcome Form**: Submit post-incident feedback to evaluate recovery.

- **Field Worker & Extension Queue (`/field-worker`)**:
  - Pending field inspection queue with distance indicators.
  - Ground truth verification form: Confirm condition, adjust severity, and log official extension notes.

- **Auditable History (`/history`)**:
  - Complete timeline and non-destructive audit log preserving every assessment version and farmer outcome.

- **Pre-Stored Recommendation Library**:
  - Every condition combination the Risk Engine can produce maps to a complete, expert-authored action plan (`src/domain/actions/recommendations.ts`) — **12 plans** across waterlogging (5 severities), heat stress, and pest/disease, aligned with ICAR/IRRI protocols.
  - Plans appear **instantly** on assessment — no generation step — and are identical every time the same conditions recur (deterministic).
  - The Safety Gate validates each plan before display (e.g. blocks fertilizer advice during active flooding).

- **Durable Persistence (Optional MongoDB)**:
  - Set `MONGODB_URI` and every incident/farm mutation is persisted (write-behind, debounced ~800ms); boot hydrates from the database; restarts survive.
  - If the database is unreachable, the app transparently runs in memory and retries in the background. Live health: `GET /api/system/persistence`.

- **Scenario Testing & Simulation Lab**:
  - Interactive simulator drawer allowing users and reviewers to manipulate 24h rainfall (0–140mm), standing water duration (0–72h), depth (0–35cm), soil drainage, and crop stage.
  - Instant live reassessment across all dashboards.

---

## 3. Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Weather Adapter**: Open-Meteo Live API + Calibrated Agro-Climatic Model
- **AI Explanation Adapter**: Google Gemini API (`GEMINI_API_KEY`) with deterministic agronomic fallback
- **Agro-Agronomic Standards**: ICAR & IRRI Paddy Submergence & Waterlogging Protocols

---

## 4. Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Tests
```bash
npm test
```
Node built-in test runner (zero dependencies): coordinate validation, polygon math, observed-vs-forecast labeling, soil provenance, evidence verdicts.

### Environment Variables (Optional)
```env
# Optional: If provided, AI explanations use live Gemini. Otherwise, built-in deterministic fallback is used.
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Override the Gemini model (default: gemini-3.8-flash)
GEMINI_MODEL=gemini-3.8-flash

# Optional: MongoDB connection string. When set, incidents & farms persist to
# MongoDB (write-behind, debounced ~800ms after each mutation, hydrate-on-boot).
# If the database is unreachable, the app transparently runs on the in-memory
# store and retries in the background. Live status: GET /api/system/persistence
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.hostname.mongodb.net/DATABASE_NAME
```

---

## 5. API Overview

All routes return `{ success, data }` or `{ success, error }`. Full contracts: `docs/prd.md` §12.

| Method | Path | Purpose |
|---|---|---|
| `GET`/`POST` | `/api/farms` | List / upsert farm profiles |
| `GET`/`POST` | `/api/incidents` | List incidents / report a new one (assessed server-side) |
| `GET` | `/api/incidents/:id` | Incident detail (incident + farm) |
| `POST` | `/api/incidents/:id/evidence` | Add ground evidence → auto-reassessment |
| `POST` | `/api/incidents/:id/reassess` | Reassess (optional `simParams` for the simulator) |
| `POST` | `/api/incidents/:id/verify` | Field-worker verification (+ severity override) |
| `POST` | `/api/incidents/:id/outcome` | Resolution & outcome feedback |
| `POST` | `/api/incidents/:id/explain` | AI explanation (Gemini, deterministic fallback) |
| `GET` | `/api/weather?lat&lng` | Live weather (Open-Meteo + fallback model) |
| `POST` | `/api/simulation/reset` | Reset baseline seed state |
| `GET` | `/api/system/persistence` | Persistence health/status |
| `GET` | `/api/geo/search?q=` | Location search (server-side proxy) |
| `GET`/`POST` | `/api/fields` | List / create field (Field Map UI parked; API still live) |
| `GET`/`PATCH` | `/api/fields/:id` | Field detail + evidence context / update (hierarchy & khasra accepted; empty string unsets) |
| `GET` | `/api/fields/:id/weather` | Weather bundle (observed/forecast/history) |
| `GET` | `/api/fields/:id/soil` | Regional soil report (provenance + disclaimer) |
| `GET`/`POST` | `/api/fields/:id/observations` | Field-condition observations |
| `GET` | `/api/fields/:id/evidence` | Unified evidence view (verdicts + missing) |
| `POST` | `/api/fields/:id/incidents` | Report incident with attached field evidence |

---

## 6. Primary Demonstration Walkthrough

1. **Baseline**: View Krishna Reddy's Paddy field in Tillering stage facing 82mm of rain and 24h standing water (Severity: **HIGH RISK**).
2. **Review Action Plan**: Inspect **DO NOW** (breach bunds, clear drainage), **AVOID** (urea application blocked), and **Why This Recommendation**.
3. **Field Verification**: Open **Field Worker Queue**, inspect the incident, and submit official verification.
4. **Interactive Simulation**: Click **"⚡ Field Scenario Simulator"** on the bottom right:
   - Slide rainfall to **115 mm** and duration to **48 hours** → Observe instant escalation to **CRITICAL RISK**.
   - Slide rainfall to **5 mm** and standing water to **0 hours** with **Good Drainage** → Observe de-escalation to **LOW / NORMAL**.
5. **Report a Problem**: Use the emergency wizard to report a new incident and watch the deterministic engine assess it in real time.
6. **Verify Persistence** (if `MONGODB_URI` is set): create an incident, restart `npm run dev`, and see it return from the database. Check health at `GET /api/system/persistence`.

---

## 7. Documentation

| Doc | Contents |
|---|---|
| [`docs/prd.md`](docs/prd.md) | **Product Requirements** — full feature inventory, risk-engine thresholds, recommendation library, AI layer, persistence, data model, API reference, known gaps, roadmap |
| [`docs/trd.md`](docs/trd.md) | Technical requirements with SHIPPED/PARTIAL/PLANNED status per requirement |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, module map with file paths, data flows |
| [`docs/app-flow.md`](docs/app-flow.md) | UX flows: reporting, verification, reassessment triggers, simulator, degradation behavior |
