# FarmRescue — System Architecture

**Version:** 0.1  
**Status:** Architecture Draft  
**Product:** FarmRescue  
**Category:** Agricultural Emergency Early Warning & Response

---

## 1. Architecture Overview

FarmRescue is an **evidence-first agricultural early-warning and response platform**.

The architecture is designed around one strict boundary:

> **Data and validated agricultural rules determine risk and allowed actions. AI explains validated results; AI does not independently decide what a farmer should do.**

### Core loop

```text
Detect
  ↓
Verify
  ↓
Assess
  ↓
Act
  ↓
Monitor
  ↓
Reassess
  ↓
Learn
```

---

# 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       FARMER         │
                         │ Mobile / SMS / IVR   │
                         │ WhatsApp             │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Field Worker / FPO   │
                         │ Operational Dashboard│
                         └──────────┬───────────┘
                                    │
                                    ▼
                     ┌────────────────────────────┐
                     │        API / Backend       │
                     │ Node.js + Express + Auth   │
                     └──────────────┬─────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
     ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
     │ Weather       │      │ Field / Crop  │      │ Farmer / Field │
     │ Data Adapter  │      │ Data          │      │ Observations   │
     └───────┬───────┘      └───────┬───────┘      └───────┬───────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │   Evidence Engine    │
                         │ Normalize + Validate │
                         │ + Freshness          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Risk Engine      │
                         │ Rules + Context      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Safety Gate      │
                         │ Evidence sufficiency │
                         │ Action validation    │
                         └──────────┬───────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
                 ┌────────────────┐   ┌────────────────┐
                 │ Action Plan    │   │ Human Escalate │
                 │ Generator      │   │ / Verification │
                 └───────┬────────┘   └───────┬────────┘
                         │                    │
                         └─────────┬──────────┘
                                   ▼
                         ┌──────────────────────┐
                         │ Notification Service │
                         │ SMS / WhatsApp / IVR │
                         └──────────┬───────────┘
                                    │
                                    ▼
                               FARMER

                                   │
                                   ▼
                         ┌──────────────────────┐
                         │ Outcome / Feedback   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ PostgreSQL + PostGIS │
                         │ History / Incidents  │
                         └──────────────────────┘
```

---

# 3. Architecture Principles

## 3.1 Evidence First
Every risk assessment should be traceable to structured evidence.
The system must avoid unexplained AI-generated conclusions.

## 3.2 AI Second
The LLM sits **after** the deterministic risk and safety layers.
The LLM should not receive unrestricted authority to generate agricultural decisions.

## 3.3 Data Freshness Is First-Class
Every external observation contains source, timestamp, observation time, retrieval time, freshness, and reliability. Stale data is explicitly surfaced.

## 3.4 Recommendations Are Time-Bounded
Every recommendation has `createdAt`, `validUntil` / `reviewAt`, `evidenceVersion`, `riskVersion`, `status`.

## 3.5 Human Escalation
Low/normal risk -> automated monitoring. High risk -> field worker notification. Insufficient evidence -> request more info / expert review.

---

# 4. Application Layers
- Layer 1: Presentation (Farmer Mobile/Web Interface + Field Worker Dashboard)
- Layer 2: API Gateway / Backend (Node.js/TypeScript)
- Layer 3: Domain Services (Evidence, Weather, Risk Engine, Safety Gate, Actions, Verification, Outcomes, AI)

---

# 5. Risk Engine & Safety Gate
Deterministic rules versioned (e.g. `PADDY_WATERLOGGING_001`).
Output severity: `NORMAL`, `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
Safety gate validates evidence sufficiency and allowed actions before generating an Action Plan:
- `doNow`
- `avoid`
- `why`
- `reviewAt`
- `escalation`
- `evidenceIds`

---

# 6. AI Explanation Layer
AI adapter receives validated facts (RiskAssessment, Evidence, ActionPlan) and produces human-readable explanation and localized phrasing. It must never invent evidence or override deterministic classifications.

---

# 7. Scenario Testing & Simulation Mode
Controlled simulation mode allowing interactive manipulation of rainfall (0-120mm), drainage (Good/Poor), water level (Normal/High), crop stages, triggering dynamic reassessment and instant alerts.
Clearly labeled: **DEMO / SIMULATION DATA**.
