import {
  Farm,
  Incident,
  EvidenceItem,
  RiskAssessment,
  ActionPlan,
  VerificationRecord,
  IncidentOutcome,
  TimelineEvent,
  SimulationParams,
  FieldObservation,
} from '@/types';
import { evaluateRisk } from '../risk/rules';
import { evaluateSafetyGate } from '../safety/safetyGate';
import { persistence } from '@/lib/persistence/mongo';
import { isValidCoordinate, isValidPolygon, polygonAreaSqM, sqMToAcres } from '@/lib/geo';

// In-memory store with MongoDB write-behind persistence.
// All mutations call persistence.markDirty() so changes land in MongoDB
// (debounced); reads are always served from memory for zero-latency UX.
class FarmRescueStore {
  private farms: Farm[] = [];
  private incidents: Incident[] = [];
  private hydrateStarted = false;

  constructor() {
    this.seedInitialData();
    void this.initPersistence();
  }

  /**
   * Try to adopt the MongoDB snapshot. Runs once per process; safe when the
   * database is unreachable (seed data stands, background retries continue).
   */
  private async initPersistence(): Promise<void> {
    if (this.hydrateStarted || !persistence.enabled) return;
    this.hydrateStarted = true;
    persistence.bindState({
      getIncidents: () => this.incidents,
      getFarms: () => this.farms,
    });
    const adopted = await persistence.hydrate((state) => {
      // Swap state atomically; only called when Mongo returned a valid
      // snapshot (validated inside the persistence layer).
      this.farms = state.farms.map((f) => ({ ...f }));
      this.incidents = state.incidents.map((i) => ({ ...i }));
    });
    // A snapshot saved before the plot registry existed has no SEEDED demo
    // plots — append them so the registry demos out of the box. (There is no
    // plot-delete API, so a missing SEEDED plot always means "never migrated".)
    if (adopted && this.ensureDemoPlots()) persistence.markDirty();
  }

  /** Append any missing SEEDED demo plots. Returns true when something was added. */
  private ensureDemoPlots(): boolean {
    let added = false;
    for (const p of demoPlotRecords()) {
      if (!this.farms.some((f) => f.id === p.id)) {
        this.farms.push(p);
        added = true;
      }
    }
    return added;
  }

  public seedInitialData() {
    const defaultFarm: Farm = {
      id: 'farm-001',
      ownerId: 'farmer-krishna',
      ownerName: 'Krishna Reddy',
      ownerPhone: '+91 98765 43210',
      name: 'Vemuru Riverbed Field',
      location: {
        lat: 16.1856,
        lng: 80.7512,
        village: 'Vemuru',
        district: 'Bapatla / Guntur',
        state: 'Andhra Pradesh',
        address: 'Survey No. 42, Canal West, Vemuru',
      },
      areaAcres: 2.8,
      crop: 'paddy',
      cropVariety: 'BPT 5204 (Samba Mahsuri)',
      cropStage: 'tillering',
      sowingDate: '2026-08-15',
      soilType: 'clay_loam',
      drainage: 'poor',
      waterSource: 'Krishna Western Delta Canal',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialIncidentId = 'inc-waterlogging-demo';
    const now = Date.now();

    const initialEvidence: EvidenceItem[] = [
      {
        id: 'ev-1',
        incidentId: initialIncidentId,
        source: 'weather_provider',
        type: 'rainfall_24h',
        value: 82,
        unit: 'mm',
        observedAt: new Date(now - 45 * 60000).toISOString(),
        retrievedAt: new Date(now - 15 * 60000).toISOString(),
        freshnessMinutes: 15,
        strength: 'STRONG',
        reliability: 'verified',
      },
      {
        id: 'ev-2',
        incidentId: initialIncidentId,
        source: 'farmer_observation',
        type: 'standing_water_duration',
        value: 24,
        unit: 'hours',
        observedAt: new Date(now - 60 * 60000).toISOString(),
        retrievedAt: new Date(now - 60 * 60000).toISOString(),
        freshnessMinutes: 60,
        strength: 'MODERATE',
        reliability: 'reported',
      },
      {
        id: 'ev-3',
        incidentId: initialIncidentId,
        source: 'farmer_observation',
        type: 'standing_water_depth',
        value: 18,
        unit: 'cm',
        observedAt: new Date(now - 60 * 60000).toISOString(),
        retrievedAt: new Date(now - 60 * 60000).toISOString(),
        freshnessMinutes: 60,
        strength: 'MODERATE',
        reliability: 'reported',
      },
      {
        id: 'ev-4',
        incidentId: initialIncidentId,
        source: 'weather_provider',
        type: 'rainfall_forecast',
        value: 35,
        unit: 'mm / 24h',
        observedAt: new Date(now - 30 * 60000).toISOString(),
        retrievedAt: new Date(now - 10 * 60000).toISOString(),
        freshnessMinutes: 10,
        strength: 'STRONG',
        reliability: 'verified',
      },
    ];

    // Evaluate risk and safety gate
    const assessment = evaluateRisk({
      farm: defaultFarm,
      evidence: initialEvidence,
      incidentType: 'waterlogging',
    });
    assessment.incidentId = initialIncidentId;

    const safetyResult = evaluateSafetyGate(assessment, defaultFarm, initialEvidence, initialIncidentId);

    const timeline: TimelineEvent[] = [
      {
        id: 'tl-1',
        incidentId: initialIncidentId,
        timestamp: new Date(now - 2 * 3600000).toISOString(),
        title: 'Incident Reported',
        description: 'Farmer reported standing water submerged tillering paddy.',
        type: 'status_change',
        actor: 'Krishna Reddy (Farmer)',
      },
      {
        id: 'tl-2',
        incidentId: initialIncidentId,
        timestamp: new Date(now - 110 * 60000).toISOString(),
        title: 'Environmental Data Synced',
        description: 'Open-Meteo recorded 82 mm precipitation in 24 hours.',
        type: 'evidence_added',
        actor: 'Weather Adapter',
      },
      {
        id: 'tl-3',
        incidentId: initialIncidentId,
        timestamp: new Date(now - 105 * 60000).toISOString(),
        title: 'Deterministic Risk Evaluated',
        description: 'Rule PADDY_WATERLOGGING_001-v1.2 classified situation as HIGH RISK.',
        type: 'assessment',
        badge: 'HIGH RISK',
        actor: 'Risk Engine',
      },
      {
        id: 'tl-4',
        incidentId: initialIncidentId,
        timestamp: new Date(now - 100 * 60000).toISOString(),
        title: 'Safety Gate & Action Plan Generated',
        description: 'Action plan validated. Intercepted granular fertilizer application. Escalation dispatched to field worker queue.',
        type: 'status_change',
        actor: 'Safety Gate',
      },
    ];

    const initialIncident: Incident = {
      id: initialIncidentId,
      farmId: defaultFarm.id,
      createdBy: defaultFarm.ownerName,
      type: 'waterlogging',
      status: 'ACTION_REQUIRED',
      severity: assessment.riskLevel,
      title: 'Monsoon Heavy Waterlogging in Tillering Paddy',
      description: 'Water has accumulated up to 18 cm following heavy continuous downpours. Embankments overflowing into lowest corner.',
      startedAt: new Date(now - 24 * 3600000).toISOString(),
      createdAt: new Date(now - 2 * 3600000).toISOString(),
      updatedAt: new Date(now - 100 * 60000).toISOString(),
      currentAssessment: assessment,
      currentActionPlan: safetyResult.actionPlan,
      evidence: initialEvidence,
      assessmentsHistory: [assessment],
      timeline,
    };

    // Demo plots (plot registry): appended AFTER the default farm — the
    // dashboard reads farms[0], which must stay the primary demo field.
    this.farms = [defaultFarm, ...demoPlotRecords()];
    this.incidents = [initialIncident];
    persistence.markDirty('seed');
  }

  public getFarms(): Farm[] {
    return this.farms;
  }

  public getFarm(id: string): Farm | undefined {
    return this.farms.find((f) => f.id === id);
  }

  public updateFarm(farm: Farm): Farm {
    const idx = this.farms.findIndex((f) => f.id === farm.id);
    if (idx >= 0) {
      this.farms[idx] = { ...farm, updatedAt: new Date().toISOString() };
      persistence.markDirty();
      return this.farms[idx];
    }
    this.farms.push(farm);
    persistence.markDirty();
    return farm;
  }

  /**
   * Create a field from map selection. Server-side validation: coordinates
   * and polygon are validated here — the client is never trusted.
   * Location provenance (source/accuracy/capturedAt) is required.
   */
  public createField(data: {
    name?: string;
    lat: number;
    lng: number;
    locationSource: 'GPS' | 'SEARCH' | 'MANUAL_PIN';
    locationAccuracyMeters?: number;
    boundary?: Array<{ lat: number; lng: number }>;
    crop?: Farm['crop'];
    cropStage?: Farm['cropStage'];
    /** Administrative hierarchy + land-record number (plot registry). */
    state?: string;
    district?: string;
    tahsil?: string;
    panchayat?: string;
    village?: string;
    khasraNo?: string;
    /** Farmer-entered Bhuiyan-style khasra details (provenance kept explicit). */
    officialRecord?: Farm['officialRecord'];
  }): { farm?: Farm; error?: string } {
    if (!isValidCoordinate(data.lat, data.lng)) {
      return { error: 'Invalid field coordinates — must be lat ∈ [-90,90], lng ∈ [-180,180].' };
    }
    if (!['GPS', 'SEARCH', 'MANUAL_PIN'].includes(data.locationSource)) {
      return { error: 'locationSource must be GPS, SEARCH, or MANUAL_PIN.' };
    }
    let boundary: Array<{ lat: number; lng: number }> | undefined;
    if (data.boundary !== undefined) {
      if (!isValidPolygon(data.boundary)) {
        return { error: 'Invalid field boundary — need 3–500 valid points.' };
      }
      boundary = data.boundary;
    }

    const now = new Date().toISOString();
    // Admin hierarchy strings: trimmed, capped — never trusted blindly.
    const clean = (v?: string) => {
      const s = (v ?? '').trim();
      if (!s) return undefined;
      if (s.length > 120) return { error: true as const, value: s.slice(0, 120) };
      return { error: false as const, value: s };
    };
    const parsed = {
      state: clean(data.state),
      district: clean(data.district),
      tahsil: clean(data.tahsil),
      panchayat: clean(data.panchayat),
      village: clean(data.village),
      khasraNo: clean(data.khasraNo),
    };
    for (const [key, r] of Object.entries(parsed)) {
      if (r && r.error) return { error: `${key} is too long (max 120 characters).` };
    }
    const str = (r: ReturnType<typeof clean>): string | undefined =>
      r && !r.error ? r.value : undefined;

    // Official khasra-report details: farmer-entered, sanitized, provenance explicit.
    let officialRecord: Farm['officialRecord'];
    if (data.officialRecord && typeof data.officialRecord === 'object') {
      const ownerName = (data.officialRecord.ownerName ?? '').trim().slice(0, 120);
      const areaText = (data.officialRecord.areaText ?? '').trim().slice(0, 60);
      if (!ownerName || !areaText) {
        return { error: 'officialRecord needs at least ownerName and areaText from the khasra report.' };
      }
      officialRecord = {
        ownerName,
        areaText,
        landType: (data.officialRecord.landType ?? '').trim().slice(0, 120) || undefined,
        areaUnit: (data.officialRecord.areaUnit ?? '').trim().slice(0, 30) || undefined,
        coOwners: Array.isArray(data.officialRecord.coOwners)
          ? data.officialRecord.coOwners.map((c: unknown) => String(c).trim().slice(0, 120)).filter(Boolean).slice(0, 10)
          : undefined,
        sourcePortal: (data.officialRecord.sourcePortal ?? 'CG Bhuiyan (revenue.cg.nic.in)').trim().slice(0, 160),
        recordedAt: new Date().toISOString(),
      };
    }

    const farm: Farm = {
      id: `farm-${Date.now()}`,
      ownerId: 'farmer-krishna',
      ownerName: 'Krishna Reddy',
      ownerPhone: '+91 98765 43210',
      name: data.name?.trim() || `Field @ ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`,
      location: {
        lat: data.lat,
        lng: data.lng,
        state: str(parsed.state),
        district: str(parsed.district),
        tahsil: str(parsed.tahsil),
        panchayat: str(parsed.panchayat),
        village: str(parsed.village),
      },
      khasraNo: str(parsed.khasraNo),
      recordSource: str(parsed.khasraNo) || str(parsed.village) ? 'REGISTERED' : undefined,
      officialRecord,
      locationSource: data.locationSource,
      locationAccuracyMeters: data.locationAccuracyMeters,
      locationCapturedAt: now,
      boundary,
      boundaryAreaAcres: boundary
        ? sqMToAcres(polygonAreaSqM(boundary))
        : undefined,
      boundaryCapturedAt: boundary ? now : undefined,
      areaAcres: boundary ? sqMToAcres(polygonAreaSqM(boundary)) || 2 : 2,
      crop: data.crop || 'paddy',
      cropVariety: 'Not set',
      cropStage: data.cropStage || 'vegetative',
      sowingDate: '',
      soilType: 'unknown' as Farm['soilType'],
      drainage: 'unknown' as Farm['drainage'],
      waterSource: 'Unknown',
      recentObservations: [],
      createdAt: now,
      updatedAt: now,
    };
    this.farms.unshift(farm);
    persistence.markDirty();
    return { farm };
  }

  /** Report field condition → evidence + stored observation (server timestamps). */
  public addFieldObservation(
    farmId: string,
    data: {
      condition: FieldObservation['condition'];
      waterDepthCm?: number;
      drainage?: 'good' | 'blocked' | 'unknown';
      notes?: string;
      reporter?: FieldObservation['reporter'];
    }
  ): { farm?: Farm; evidence?: EvidenceItem; error?: string } {
    const farm = this.getFarm(farmId);
    if (!farm) return { error: 'Field not found.' };

    const validConditions = ['dry', 'normal', 'wet', 'standing_water', 'waterlogged', 'unknown'];
    if (!validConditions.includes(data.condition)) {
      return { error: `condition must be one of: ${validConditions.join(', ')}.` };
    }
    if (
      data.waterDepthCm !== undefined &&
      (!Number.isFinite(data.waterDepthCm) || data.waterDepthCm < 0 || data.waterDepthCm > 200)
    ) {
      return { error: 'waterDepthCm must be between 0 and 200.' };
    }

    const now = new Date().toISOString();
    const obs: FieldObservation = {
      id: `obs-${Date.now()}`,
      farmId,
      condition: data.condition,
      waterDepthCm: data.waterDepthCm,
      drainage: data.drainage,
      notes: data.notes,
      reporter: data.reporter || 'FARMER',
      observedAt: now,
      receivedAt: now,
    };

    // Evidence for the risk engine (server-assigned receivedAt + id).
    const evidence: EvidenceItem = {
      id: `ev-${Date.now()}-cond`,
      incidentId: '',
      source: obs.reporter === 'FIELD_WORKER' ? 'field_worker' : 'farmer_observation',
      type: 'farmer_note',
      value: obs.condition,
      unit: undefined,
      observedAt: obs.observedAt,
      retrievedAt: obs.receivedAt,
      freshnessMinutes: 0,
      strength: 'MODERATE',
      reliability: 'reported',
      kind: 'REPORTED',
      location: { lat: farm.location.lat, lng: farm.location.lng },
      metadata: {
        observationId: obs.id,
        waterDepthCm: obs.waterDepthCm,
        drainage: obs.drainage,
        notes: obs.notes,
      },
    };
    if (data.waterDepthCm !== undefined && data.condition !== 'unknown') {
      // Depth is the machine-readable signal the waterlogging rule reads.
      evidence.type = 'standing_water_depth';
      evidence.value = data.waterDepthCm;
      evidence.unit = 'cm';
    }

    farm.recentObservations = [obs, ...(farm.recentObservations ?? [])].slice(0, 20);
    farm.drainage = data.drainage === 'blocked' ? 'poor' : data.drainage === 'good' ? 'good' : farm.drainage;
    farm.updatedAt = now;
    persistence.markDirty();
    return { farm, evidence };
  }

  /** Latest non-unknown field condition (for incident evidence context). */
  public getLatestCondition(farmId: string): FieldObservation | null {
    const farm = this.getFarm(farmId);
    if (!farm) return null;
    const list = farm.recentObservations ?? [];
    return list.find((o) => o.condition !== 'unknown') ?? null;
  }

  public getIncidents(): Incident[] {
    return this.incidents;
  }

  public getIncident(id: string): Incident | undefined {
    return this.incidents.find((i) => i.id === id);
  }

  public createIncident(data: {
    farmId: string;
    type: Incident['type'];
    description: string;
    standingWaterHours?: number;
    standingWaterDepthCm?: number;
    startedAt?: string;
    /** Pre-validated field evidence (weather/soil/observation) to attach. */
    attachedEvidence?: EvidenceItem[];
  }): Incident {
    const farm = this.getFarm(data.farmId) || this.farms[0];
    const incidentId = `inc-${Date.now()}`;
    const now = Date.now();

    // Field evidence first (weather/soil/observation — pre-validated by the
    // field context pipeline), then farmer wizard inputs. If no field evidence
    // exists (legacy wizard flow), fall back to the previous synthetic seed so
    // the original demo path is unchanged.
    const evidenceList: EvidenceItem[] = (data.attachedEvidence ?? []).map((e, i) => ({
      ...e,
      id: e.id || `ev-${now}-att-${i}`,
      incidentId,
    }));

    if (evidenceList.length === 0) {
      evidenceList.push({
        id: `ev-${now}-1`,
        incidentId,
        source: 'weather_provider',
        type: 'rainfall_24h',
        value: 65,
        unit: 'mm',
        observedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        freshnessMinutes: 5,
        strength: 'STRONG',
        reliability: 'verified',
      });
    }

    if (data.standingWaterHours) {
      evidenceList.push({
        id: `ev-${now}-2`,
        incidentId,
        source: 'farmer_observation',
        type: 'standing_water_duration',
        value: data.standingWaterHours,
        unit: 'hours',
        observedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        freshnessMinutes: 1,
        strength: 'MODERATE',
        reliability: 'reported',
      });
    }

    if (data.standingWaterDepthCm !== undefined && data.standingWaterDepthCm !== null) {
      evidenceList.push({
        id: `ev-${now}-3`,
        incidentId,
        source: 'farmer_observation',
        type: 'standing_water_depth',
        value: data.standingWaterDepthCm,
        unit: 'cm',
        observedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        freshnessMinutes: 1,
        strength: 'MODERATE',
        reliability: 'reported',
      });
    }

    const assessment = evaluateRisk({
      farm,
      evidence: evidenceList,
      incidentType: data.type,
    });
    assessment.incidentId = incidentId;

    const safetyResult = evaluateSafetyGate(assessment, farm, evidenceList, incidentId);

    const timeline: TimelineEvent[] = [
      {
        id: `tl-${now}-1`,
        incidentId,
        timestamp: new Date().toISOString(),
        title: 'Problem Reported',
        description: data.description,
        type: 'status_change',
        actor: farm.ownerName,
      },
      {
        id: `tl-${now}-2`,
        incidentId,
        timestamp: new Date().toISOString(),
        title: 'Initial Risk Evaluation',
        description: `Classified as ${assessment.riskLevel} (${assessment.ruleVersion}).`,
        type: 'assessment',
        badge: assessment.riskLevel,
        actor: 'Risk Engine',
      },
    ];

    const incident: Incident = {
      id: incidentId,
      farmId: farm.id,
      createdBy: farm.ownerName,
      type: data.type,
      status: 'ACTION_REQUIRED',
      severity: assessment.riskLevel,
      title: `${data.type.replace('_', ' ').toUpperCase()} on ${farm.name}`,
      description: data.description,
      startedAt: data.startedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentAssessment: assessment,
      currentActionPlan: safetyResult.actionPlan,
      evidence: evidenceList,
      assessmentsHistory: [assessment],
      timeline,
    };

    this.incidents.unshift(incident);
    persistence.markDirty();
    return incident;
  }

  public addEvidence(incidentId: string, item: Omit<EvidenceItem, 'id' | 'incidentId'>): Incident | undefined {
    const incident = this.getIncident(incidentId);
    if (!incident) return undefined;

    const farm = this.getFarm(incident.farmId) || this.farms[0];
    const newEvidence: EvidenceItem = {
      ...item,
      id: `ev-${Date.now()}`,
      incidentId,
    };

    incident.evidence.push(newEvidence);
    incident.timeline.push({
      id: `tl-${Date.now()}`,
      incidentId,
      timestamp: new Date().toISOString(),
      title: 'New Evidence Added',
      description: `${item.source} logged ${item.type} = ${item.value} ${item.unit || ''}`,
      type: 'evidence_added',
      actor: item.source,
    });

    // Reassess with new evidence
    const updated = this.triggerReassessment(incidentId, farm);
    if (updated) persistence.markDirty();
    return updated;
  }

  public triggerReassessment(
    incidentId: string,
    farmOverride?: Farm,
    simParams?: Partial<SimulationParams>
  ): Incident | undefined {
    const incident = this.getIncident(incidentId);
    if (!incident) return undefined;

    const farm = farmOverride || this.getFarm(incident.farmId) || this.farms[0];

    // If simulation params provided, update evidence accordingly
    if (simParams) {
      if (simParams.rainfall24h !== undefined) {
        incident.evidence = incident.evidence.filter((e) => e.type !== 'rainfall_24h');
        incident.evidence.push({
          id: `ev-sim-${Date.now()}-rain`,
          incidentId,
          source: 'simulation',
          type: 'rainfall_24h',
          value: simParams.rainfall24h,
          unit: 'mm',
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          freshnessMinutes: 1,
          strength: 'STRONG',
          reliability: 'simulated',
        });
      }

      if (simParams.standingWaterHours !== undefined) {
        incident.evidence = incident.evidence.filter((e) => e.type !== 'standing_water_duration');
        incident.evidence.push({
          id: `ev-sim-${Date.now()}-dur`,
          incidentId,
          source: 'simulation',
          type: 'standing_water_duration',
          value: simParams.standingWaterHours,
          unit: 'hours',
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          freshnessMinutes: 1,
          strength: 'MODERATE',
          reliability: 'simulated',
        });
      }

      if (simParams.standingWaterDepthCm !== undefined) {
        incident.evidence = incident.evidence.filter((e) => e.type !== 'standing_water_depth');
        incident.evidence.push({
          id: `ev-sim-${Date.now()}-depth`,
          incidentId,
          source: 'simulation',
          type: 'standing_water_depth',
          value: simParams.standingWaterDepthCm,
          unit: 'cm',
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          freshnessMinutes: 1,
          strength: 'MODERATE',
          reliability: 'simulated',
        });
      }

      if (simParams.drainage) {
        farm.drainage = simParams.drainage;
      }
      if (simParams.cropStage) {
        farm.cropStage = simParams.cropStage;
      }
    }

    const previousSeverity = incident.severity;
    const newAssessment = evaluateRisk({
      farm,
      evidence: incident.evidence,
      incidentType: incident.type,
    });
    newAssessment.incidentId = incidentId;

    const safety = evaluateSafetyGate(newAssessment, farm, incident.evidence, incidentId);

    incident.currentAssessment = newAssessment;
    incident.currentActionPlan = safety.actionPlan;
    incident.severity = newAssessment.riskLevel;
    incident.assessmentsHistory.push(newAssessment);
    incident.updatedAt = new Date().toISOString();

    const changeText =
      previousSeverity !== newAssessment.riskLevel
        ? `Risk level shifted from ${previousSeverity} → ${newAssessment.riskLevel}`
        : `Assessment confirmed at ${newAssessment.riskLevel}`;

    incident.timeline.push({
      id: `tl-${Date.now()}`,
      incidentId,
      timestamp: new Date().toISOString(),
      title: 'Incident Reassessed',
      description: `${changeText}. Rule: ${newAssessment.ruleVersion}.`,
      type: 'assessment',
      badge: newAssessment.riskLevel,
      actor: 'Reassessment Engine',
    });

    persistence.markDirty();
    return incident;
  }

  public submitVerification(
    incidentId: string,
    verification: Omit<VerificationRecord, 'id' | 'incidentId' | 'verifiedAt'>
  ): Incident | undefined {
    const incident = this.getIncident(incidentId);
    if (!incident) return undefined;

    const record: VerificationRecord = {
      id: `ver-${Date.now()}`,
      incidentId,
      workerId: verification.workerId,
      workerName: verification.workerName,
      status: verification.status,
      observation: verification.observation,
      verifiedSeverity: verification.verifiedSeverity,
      notes: verification.notes,
      verifiedAt: new Date().toISOString(),
    };

    incident.verification = record;
    if (verification.verifiedSeverity) {
      incident.severity = verification.verifiedSeverity;
    }
    incident.status = 'VERIFIED';
    incident.updatedAt = new Date().toISOString();

    incident.timeline.push({
      id: `tl-${Date.now()}`,
      incidentId,
      timestamp: new Date().toISOString(),
      title: `Field Worker Verification: ${verification.status}`,
      description: `${verification.workerName} inspected field: "${verification.observation}". Verified severity: ${verification.verifiedSeverity || incident.severity}.`,
      type: 'verification',
      badge: verification.status,
      actor: verification.workerName,
    });

    persistence.markDirty();
    return incident;
  }

  public submitOutcome(
    incidentId: string,
    outcome: Omit<IncidentOutcome, 'id' | 'incidentId' | 'resolvedAt'>
  ): Incident | undefined {
    const incident = this.getIncident(incidentId);
    if (!incident) return undefined;

    const record: IncidentOutcome = {
      id: `out-${Date.now()}`,
      incidentId,
      situationImproved: outcome.situationImproved,
      actionsHelpful: outcome.actionsHelpful,
      observedDamage: outcome.observedDamage,
      cropCondition: outcome.cropCondition,
      farmerFeedback: outcome.farmerFeedback,
      fieldWorkerNotes: outcome.fieldWorkerNotes,
      resolvedAt: new Date().toISOString(),
    };

    incident.outcome = record;
    incident.status = 'RESOLVED';
    incident.severity = 'NORMAL';
    incident.updatedAt = new Date().toISOString();

    incident.timeline.push({
      id: `tl-${Date.now()}`,
      incidentId,
      timestamp: new Date().toISOString(),
      title: 'Incident Resolved',
      description: `Situation improved: ${outcome.situationImproved}. Farmer feedback: "${outcome.farmerFeedback}". Crop condition: ${outcome.cropCondition}.`,
      type: 'resolved',
      badge: 'RESOLVED',
      actor: 'Farmer & Field Worker',
    });

    persistence.markDirty();
    return incident;
  }
}

/**
 * Demo plots for the Plot Registry. Module-level so BOTH seedInitialData and
 * the post-hydrate ensureDemoPlots() migration share one definition.
 * Appended after the default farm — the dashboard reads farms[0].
 * recordSource: SEEDED marks these as demo data (never disguised as live).
 */
function demoPlotRecords(): Farm[] {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  return [
    {
      id: 'plot-demo-vemuru-42',
      ownerId: 'farmer-krishna',
      ownerName: 'Krishna Reddy',
      ownerPhone: '+91 98765 43210',
      name: 'Vemuru Khasra 42 — North Paddy',
      location: {
        lat: 16.1871,
        lng: 80.7495,
        state: 'Andhra Pradesh',
        district: 'Bapatla',
        tahsil: 'Vemuru',
        panchayat: 'Vemuru',
        village: 'Vemuru',
        address: 'Khasra 42/1B, North Bund, Vemuru',
      },
      khasraNo: '42/1B',
      recordSource: 'SEEDED',
      locationSource: 'MANUAL_PIN',
      locationCapturedAt: daysAgo(20),
      areaAcres: 2.4,
      crop: 'paddy',
      cropVariety: 'BPT 5204 (Samba Mahsuri)',
      cropStage: 'tillering',
      sowingDate: '2026-08-15',
      soilType: 'clay_loam',
      drainage: 'poor',
      waterSource: 'Krishna Western Delta Canal',
      recentObservations: [],
      createdAt: daysAgo(20),
      updatedAt: daysAgo(2),
    },
    {
      id: 'plot-demo-vemuru-43',
      ownerId: 'farmer-krishna',
      ownerName: 'Krishna Reddy',
      ownerPhone: '+91 98765 43210',
      name: 'Vemuru Khasra 43 — Canal Side',
      location: {
        lat: 16.184,
        lng: 80.7535,
        state: 'Andhra Pradesh',
        district: 'Bapatla',
        tahsil: 'Vemuru',
        panchayat: 'Vemuru',
        village: 'Vemuru',
        address: 'Khasra 43, Canal East, Vemuru',
      },
      khasraNo: '43',
      recordSource: 'SEEDED',
      locationSource: 'MANUAL_PIN',
      locationCapturedAt: daysAgo(15),
      areaAcres: 1.8,
      crop: 'paddy',
      cropVariety: 'MTU 1010',
      cropStage: 'seedling',
      sowingDate: '2026-08-28',
      soilType: 'clay_loam',
      drainage: 'moderate',
      waterSource: 'Rainfed + canal share',
      recentObservations: [],
      createdAt: daysAgo(15),
      updatedAt: daysAgo(5),
    },
    {
      id: 'plot-demo-raipur-7',
      ownerId: 'farmer-sunita',
      ownerName: 'Sunita Bai',
      ownerPhone: '+91 91234 56780',
      name: 'Abhanpur Khasra 7 — Sorghum Plot',
      location: {
        lat: 21.2214,
        lng: 81.7098,
        state: 'Chhattisgarh',
        district: 'Raipur',
        tahsil: 'Abhanpur',
        panchayat: 'Abhanpur',
        village: 'Abhanpur',
        address: 'Khasra 7/2, Abhanpur',
      },
      khasraNo: '7/2',
      recordSource: 'SEEDED',
      locationSource: 'MANUAL_PIN',
      locationCapturedAt: daysAgo(10),
      areaAcres: 3.1,
      crop: 'pulses',
      cropVariety: 'Local Tur',
      cropStage: 'vegetative',
      sowingDate: '2026-08-05',
      soilType: 'black_cotton',
      drainage: 'moderate',
      waterSource: 'Borewell',
      recentObservations: [],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(3),
    },
  ];
}

// Global singleton instance — cached on globalThis so Next.js dev-mode
// route recompilations (HMR) reuse the SAME store instead of re-seeding a
// fresh copy per route bundle. In production there is exactly one instance.
const globalForStore = globalThis as unknown as { __farmrescueStore?: FarmRescueStore };
export const store = globalForStore.__farmrescueStore ?? new FarmRescueStore();
globalForStore.__farmrescueStore = store;
