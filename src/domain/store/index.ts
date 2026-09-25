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
} from '@/types';
import { evaluateRisk } from '../risk/rules';
import { evaluateSafetyGate } from '../safety/safetyGate';

// In-memory persistent state during server runtime
class FarmRescueStore {
  private farms: Farm[] = [];
  private incidents: Incident[] = [];

  constructor() {
    this.seedInitialData();
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

    this.farms = [defaultFarm];
    this.incidents = [initialIncident];
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
      return this.farms[idx];
    }
    this.farms.push(farm);
    return farm;
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
  }): Incident {
    const farm = this.getFarm(data.farmId) || this.farms[0];
    const incidentId = `inc-${Date.now()}`;
    const now = Date.now();

    const evidenceList: EvidenceItem[] = [
      {
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
      },
    ];

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

    if (data.standingWaterDepthCm) {
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
    return this.triggerReassessment(incidentId, farm);
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

    return incident;
  }
}

// Global singleton instance
export const store = new FarmRescueStore();
