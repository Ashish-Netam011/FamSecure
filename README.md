# FarmRescue 🌾

**Emergency Agricultural Early-Warning and Response Platform**  
*“What should I do when the farm suddenly goes wrong?”*  
*Developed for **AGRITHON 2026***

---

## 1. Architectural Philosophy

FarmRescue is built around one fundamental rule:

> **Data and validated agricultural rules determine risk and allowed actions.  
> AI explains validated results; AI does not independently decide what a farmer should do.**

```text
Data / Weather / Observations
             ↓
  Normalized Evidence Engine
             ↓
 Deterministic Risk Engine (Versioned Rules)
             ↓
        Safety Gate (Evidence & Action Safety)
             ↓
  Structured Action Plan (Do Now, Avoid, Monitor)
             ↓
 Human-in-the-Loop Verification (Field Worker)
             ↓
   AI Explanation Layer (Gemini Adapter)
             ↓
  Farmer & Extension Dashboard
             ↓
  Dynamic Reassessment & Auditable Outcomes
```

---

## 2. Core Features (P0 MVP)

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

- **Field Worker & FPO Portal (`/field-worker`)**:
  - Pending field inspection queue with distance indicators.
  - Ground truth verification form: Confirm condition, adjust severity, and log official extension notes.

- **Auditable History (`/history`)**:
  - Complete timeline and non-destructive audit log preserving every assessment version and farmer outcome.

- **AGRITHON Simulation Controls**:
  - Interactive simulator drawer allowing judges to manipulate 24h rainfall (0–140mm), standing water duration (0–72h), depth (0–35cm), soil drainage, and crop stage.
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

### Environment Variables (Optional)
```env
# Optional: If provided, AI explanations use live Gemini. Otherwise, built-in deterministic fallback is used.
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 5. Primary AGRITHON Demonstration Walkthrough

1. **Baseline**: View Krishna Reddy's Paddy field in Tillering stage facing 82mm of rain and 24h standing water (Severity: **HIGH RISK**).
2. **Review Action Plan**: Inspect **DO NOW** (breach bunds, clear drainage), **AVOID** (urea application blocked), and **Why This Recommendation**.
3. **Field Verification**: Open **Field Worker Queue**, inspect the incident, and submit official verification.
4. **Interactive Simulation**: Click **"AGRITHON Simulation Controls"** on the bottom right:
   - Slide rainfall to **115 mm** and duration to **48 hours** → Observe instant escalation to **CRITICAL RISK**.
   - Slide rainfall to **5 mm** and standing water to **0 hours** with **Good Drainage** → Observe de-escalation to **LOW / NORMAL**.
5. **Report a Problem**: Use the emergency wizard to report a new incident and watch the deterministic engine assess it in real time.
