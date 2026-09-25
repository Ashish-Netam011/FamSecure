# FarmRescue — Technical Requirements Document

**Project:** FarmRescue  
**Product Promise:** *“What should I do when the farm suddenly goes wrong?”*  
**Document:** Technical Requirements Document (TRD)  
**Version:** 1.0  
**Status:** Implementation Specification  
**Primary Demo:** Paddy + heavy rainfall / waterlogging  
**Secondary Scenarios:** Heat stress, pest/disease incidents  

---

# Core Principles & Invariants

```text
Data / Sensor / Observations
        ↓
Normalized Evidence Engine
        ↓
Deterministic Risk Engine (Versioned Rules)
        ↓
Safety Gate (Sufficiency & Permissibility)
        ↓
Structured Action Plan (Do Now, Do Next, Avoid, Monitor, Escalate)
        ↓
Human-in-the-Loop Verification (Field Worker)
        ↓
AI Explanation Adapter (Gemini / Mock)
        ↓
Farmer & Field Worker UI
        ↓
Dynamic Reassessment & Outcomes
```

**Key Architectural Invariant:**
> *AI explains the evidence-backed decision; AI does not become the decision itself.*

---

# Functional Scope & Implementation Requirements

1. **FR-01 to FR-04: Incident & Farm Management & Evidence Scoring**
   - Farm profiles with coordinates, crop types (paddy focus), variety, growth stage, soil, drainage.
   - Incident reporting with multi-source evidence (farmer observation, weather adapter, field officer).
   - Evidence classification: `STRONG`, `MODERATE`, `WEAK`, `UNVERIFIED`, `CONFLICTING` + Freshness tracking.

2. **FR-07 to FR-09: Deterministic Risk Engine & Safety Gate**
   - Versioned rules (e.g. `PADDY_WATERLOGGING_001`).
   - Risk levels: `NORMAL`, `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
   - Safety Gate verifies evidence sufficiency, checks for conflicting data, enforces escalation if necessary, and formats validated action plans.

3. **FR-10: AI Explanation Adapter**
   - Receives validated facts only (no hallucinated context).
   - Explains *why* the rules fired and translates actions into clear, empathetic, local-language agricultural advice.
   - Graceful fallback: If AI fails or is offline, raw deterministic action plan and reasoning are rendered seamlessly.

4. **FR-11 to FR-13: Human Verification, Timeline & Reassessment Engine**
   - Field worker verification workflow.
   - Non-destructive reassessments: Each reassessment appends a new assessment record.
   - Full auditable timeline.

5. **AGRITHON Simulation Mode (Section 43 of Architecture)**
   - Interactive simulation toolbar allowing judges/evaluators to slide rainfall (0-120mm), toggle drainage (Good/Poor), water level, and observe live reassessment and state transitions.
