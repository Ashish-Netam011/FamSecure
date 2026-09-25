export type UserRole = 'FARMER' | 'FIELD_WORKER' | 'FPO_ADMIN' | 'SYSTEM_ADMIN';

export type CropType = 'paddy' | 'wheat' | 'maize' | 'cotton' | 'pulses' | 'vegetables';

export type CropStage =
  | 'germination'
  | 'seedling'
  | 'tillering'
  | 'vegetative'
  | 'panicle_initiation'
  | 'flowering'
  | 'ripening'
  | 'harvest';

export type SoilType = 'clay' | 'clay_loam' | 'sandy_loam' | 'loam' | 'sandy' | 'black_cotton';

export type DrainageType = 'poor' | 'moderate' | 'good' | 'excessive';

export type RiskLevel = 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'UNVERIFIED' | 'CONFLICTING';

export type EvidenceSource =
  | 'weather_provider'
  | 'farmer_observation'
  | 'field_worker'
  | 'sensor'
  | 'simulation';

export type IncidentType =
  | 'heavy_rain'
  | 'waterlogging'
  | 'heat_stress'
  | 'pest'
  | 'disease'
  | 'other';

export type IncidentStatus =
  | 'DETECTED'
  | 'ASSESSING'
  | 'ACTION_REQUIRED'
  | 'NOTIFIED'
  | 'VERIFIED'
  | 'MONITORING'
  | 'RESOLVED';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
  village?: string;
  district?: string;
  state?: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  name: string;
  location: LocationCoordinates;
  areaAcres: number;
  crop: CropType;
  cropVariety: string;
  cropStage: CropStage;
  sowingDate: string;
  soilType: SoilType;
  drainage: DrainageType;
  waterSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  source: EvidenceSource;
  type:
    | 'rainfall_24h'
    | 'rainfall_forecast'
    | 'standing_water_depth'
    | 'standing_water_duration'
    | 'temperature'
    | 'humidity'
    | 'soil_saturation'
    | 'leaf_yellowing'
    | 'lodging_plants'
    | 'pest_sighting'
    | 'farmer_note'
    | 'field_worker_photo';
  value: number | string | boolean;
  unit?: string;
  observedAt: string;
  retrievedAt: string;
  freshnessMinutes: number;
  strength: EvidenceStrength;
  reliability: 'verified' | 'reported' | 'simulated' | 'stale';
  metadata?: Record<string, unknown>;
}

export interface RiskAssessment {
  id: string;
  incidentId: string;
  ruleVersion: string;
  riskLevel: RiskLevel;
  evidenceStrength: EvidenceStrength;
  contributingEvidence: string[];
  missingEvidence: string[];
  assessedAt: string;
  reviewAt: string;
  escalationRequired: boolean;
  rationale: string;
}

export interface ActionPlan {
  id: string;
  incidentId: string;
  assessmentId: string;
  doNow: string[];
  doNext: string[];
  avoid: string[];
  monitor: string[];
  escalate: string[];
  why: string;
  reviewAt: string;
  version: string;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  incidentId: string;
  workerId: string;
  workerName: string;
  status: 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'NOT_CONFIRMED' | 'NEEDS_MORE_INFORMATION';
  observation: string;
  verifiedSeverity?: RiskLevel;
  verifiedAt: string;
  notes: string;
}

export interface IncidentOutcome {
  id: string;
  incidentId: string;
  situationImproved: 'yes' | 'partially' | 'no';
  actionsHelpful: 'yes' | 'partially' | 'no';
  observedDamage: string;
  cropCondition: string;
  farmerFeedback: string;
  fieldWorkerNotes?: string;
  resolvedAt: string;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'status_change' | 'evidence_added' | 'assessment' | 'verification' | 'notification' | 'resolved';
  badge?: string;
  actor?: string;
}

export interface Incident {
  id: string;
  farmId: string;
  createdBy: string;
  type: IncidentType;
  status: IncidentStatus;
  severity: RiskLevel;
  title: string;
  description: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  currentAssessment?: RiskAssessment;
  currentActionPlan?: ActionPlan;
  verification?: VerificationRecord;
  outcome?: IncidentOutcome;
  evidence: EvidenceItem[];
  assessmentsHistory: RiskAssessment[];
  timeline: TimelineEvent[];
}

export interface SimulationParams {
  rainfall24h: number; // mm
  forecastRainfall: number; // mm
  standingWaterDepthCm: number; // cm
  standingWaterHours: number; // hours
  drainage: DrainageType;
  temperatureC: number;
  cropStage: CropStage;
  soilType: SoilType;
}

export interface ExplanationResponse {
  summary: string;
  why: string[];
  doNowExplanation: string[];
  avoidExplanation: string[];
  watchFor: string[];
  escalationNotice: string;
  source: 'ai_adapter_gemini' | 'deterministic_fallback';
}
