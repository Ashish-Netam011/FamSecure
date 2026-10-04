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

export type EvidenceKind = 'OBSERVED' | 'FORECAST' | 'MODELLED' | 'REPORTED' | 'DEMO';

export type EvidenceVerdict =
  | 'STRONG'
  | 'MODERATE'
  | 'LIMITED'
  | 'UNKNOWN';

export type IncidentType =
  | 'heavy_rain'
  | 'waterlogging'
  | 'heat_stress'
  | 'pest'
  | 'disease'
  | 'other';

export type FieldWaterCondition =
  | 'dry'
  | 'normal'
  | 'wet'
  | 'standing_water'
  | 'waterlogged'
  | 'unknown';

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
  /** Administrative hierarchy below district (plot/land-record lookup). */
  tahsil?: string;
  panchayat?: string;
}

export type LocationSource = 'GPS' | 'SEARCH' | 'MANUAL_PIN';

export interface FieldObservation {
  id: string;
  farmId: string;
  condition: FieldWaterCondition;
  waterDepthCm?: number;
  drainage?: 'good' | 'blocked' | 'unknown';
  notes?: string;
  reporter: 'FARMER' | 'FIELD_WORKER' | 'SYSTEM';
  observedAt: string;
  receivedAt: string;
  evidenceId?: string;
}

/**
 * Bhuiyan-style land-record details for a plot, self-entered by the farmer from
 * the official portal (e.g. revenue.cg.nic.in Bhuiyan khasra report).
 * Provenance is explicit: "farmer-entered from official record", never server-verified.
 */
export interface OfficialRecord {
  /** Landholder name exactly as on the khasra report (e.g. राम कुमार). */
  ownerName: string;
  /** Area exactly as recorded (e.g. "0.410" hectare). */
  areaText: string;
  /** Kisam / land type from the report (e.g. तालाब, कृषि भूमि). */
  landType?: string;
  /** Rakba units as shown on the report (default: hectare). */
  areaUnit?: string;
  /** Parent/consortium owners, if the report lists several (optional). */
  coOwners?: string[];
  /** Where the farmer copied the values from. */
  sourcePortal?: string;
  /** When the farmer copied it (ISO string). */
  recordedAt: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  name: string;
  location: LocationCoordinates;
  locationSource?: LocationSource;
  locationAccuracyMeters?: number;
  locationCapturedAt?: string;
  boundary?: LocationCoordinates[]; // user-marked, not survey-grade
  boundaryAreaAcres?: number;
  boundaryCapturedAt?: string;
  /** Khasra / plot number identifying this parcel in land records. */
  khasraNo?: string;
  /** SEEDED = bundled demo plot; REGISTERED = created by a user. */
  recordSource?: 'SEEDED' | 'REGISTERED';
  /** Farmer-entered khasra-report details (Bhuiyan-style), provenance explicit. */
  officialRecord?: OfficialRecord;
  areaAcres: number;
  crop: CropType;
  cropVariety: string;
  cropStage: CropStage;
  sowingDate: string;
  soilType: SoilType;
  drainage: DrainageType;
  waterSource: string;
  /** Recent field-condition observations (farmer/field-worker reported). */
  recentObservations?: FieldObservation[];
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
  /** Evidence kind label surfaced in provenance UI. */
  kind?: EvidenceKind;
  /** Optional verdict + reasons (quality pipeline output). */
  verdict?: EvidenceVerdict;
  verdictReasons?: string[];
  location?: { lat: number; lng: number };
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

export interface FieldWeatherBundle {
  current: {
    temperatureC: number;
    humidityPct: number;
    rainfall24hMm: number;
    windSpeedKmh: number;
    conditionDescription: string;
    kind: 'OBSERVED';
    observedAt: string;
  };
  forecast: Array<{
    date: string;
    rainfallMm: number;
    tempMinC: number;
    tempMaxC: number;
    windMaxKmh: number;
    kind: 'FORECAST';
  }>;
  history: Array<{
    date: string;
    rainfallMm: number;
    kind: 'OBSERVED';
  }>;
  provider: string;
  retrievedAt: string;
  source: 'open_meteo_live' | 'fallback_climate_model';
  degraded: boolean;
}

export type SoilProvenance = 'REGIONAL_MODELLED' | 'FARMER_REPORTED' | 'FIELD_MEASURED' | 'UNKNOWN';

export interface SoilReport {
  available: boolean;
  provenance: SoilProvenance;
  unavailableReason?: string;
  properties: Array<{
    key: string;
    label: string;
    value: string;
    unit?: string;
  }>;
  sourceLabel: string;
  disclaimer: string;
  retrievedAt: string;
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
