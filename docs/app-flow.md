# FarmRescue — App Flow

**Project:** FarmRescue  
**Core Question:** *“What should I do when the farm suddenly goes wrong?”*  
**Version:** 1.0  
**Status:** Product Flow Specification  

---

# 1. Product Flow Philosophy

FarmRescue is not designed as a generic agricultural chatbot.

The primary experience is:

```text
Something went wrong
        ↓
Tell FarmRescue
        ↓
Understand the situation
        ↓
Check evidence
        ↓
Assess risk
        ↓
Tell me what to do NOW
        ↓
Monitor
        ↓
Reassess
        ↓
Resolve
```

The application should always prioritize **action over information overload**.

---

# 2. User Roles

FarmRescue has three primary roles:
- **FARMER**: Reports incidents, manages farm, reviews actions, submits feedback/outcomes.
- **FIELD WORKER**: Verifies high-risk/unclear incidents, provides ground truth observations and recommendations.
- **ADMIN**: Manages rules, users, audit logs, system health.

---

# 3. Primary Screens & Navigation

- **Farmer Dashboard**: Farm status, active incidents with severity badges, current weather conditions, prominent emergency CTA: *"🚨 Something wrong with your farm? [Report a Problem]"*.
- **Incident Creation Flow**: Fast, non-academic reporting. Incident type (Heavy Rain, Waterlogging, Heat Stress, Pest, Disease, Something Else), field symptoms, duration, photos, field water level.
- **Evidence Confirmation & Assessment**: Shows verifiable data points (rainfall, crop, standing water), runs through deterministic Risk Engine + Safety Gate.
- **Action Screen (Core UI)**: Clear division into:
  - **DO NOW**: Immediate low-risk actions (e.g. clear drainage outlets).
  - **AVOID**: Harmful actions (e.g. do not apply fertilizer or additional water).
  - **MONITOR**: Symptoms to watch for.
  - **GET HELP / ESCALATION**: Field worker review status.
  - **WHY THIS RECOMMENDATION**: Expandable evidence explanation powered by AI adapter.
- **Field Worker Queue & Verification**: Incident inspection, ground-truth verification form (Confirm, Needs More Evidence, Reject), severity override.
- **Dynamic Reassessment & Timeline**: When new rainfall or field evidence is added, automatic reassessment records a new risk assessment version without overwriting history.
- **Resolution & Outcome Form**: Recording whether condition improved, actions helped, and crop status.
