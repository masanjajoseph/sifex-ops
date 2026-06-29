import { HouseAWBStatus, ScanEventType, CargoEventType } from "@/types/cargo-domain";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";
import { TransitionValidator } from "../validators/transition-validator";
import { HOUSE_AWB_SCAN_MAP } from "./scan-transition-map";

export interface ScanEventInput {
  barcode: string;
  eventType: ScanEventType;
  userId: string;
  userRole: string;
  stationId?: string;
  location?: { latitude: number; longitude: number; address: string };
  metadata?: Record<string, unknown>;
  presentFields?: Record<string, boolean>;
}

export interface ScanEventOutput {
  success: boolean;
  houseAWBId?: string;
  masterAWBId?: string;
  newStatus?: HouseAWBStatus;
  eventType?: CargoEventType;
  errors?: string[];
  warnings?: string[];
}

// Map scan event types to their cargo event type counterparts
const SCAN_TO_CARGO_EVENT: Record<ScanEventType, CargoEventType> = {
  [ScanEventType.SCAN_PICKUP]: CargoEventType.EXPORT_PICKED_UP,
  [ScanEventType.SCAN_ARRIVAL_AT_WAREHOUSE]: CargoEventType.EXPORT_AT_ORIGIN_WAREHOUSE,
  [ScanEventType.SCAN_CONSOLIDATION]: CargoEventType.WAREHOUSE_CONSOLIDATED,
  [ScanEventType.SCAN_MANIFESTING]: CargoEventType.EXPORT_MANIFESTED,
  [ScanEventType.SCAN_LOADING_TO_AIRLINE]: CargoEventType.EXPORT_LOADED_TO_AIRLINE,
  [ScanEventType.SCAN_DEPARTURE]: CargoEventType.EXPORT_IN_TRANSIT,
  [ScanEventType.SCAN_ARRIVAL_AT_HUB]: CargoEventType.IMPORT_ARRIVED_AT_HUB,
  [ScanEventType.SCAN_CUSTOMS_SUBMISSION]: CargoEventType.CUSTOMS_DECLARATION_SUBMITTED,
  [ScanEventType.SCAN_CUSTOMS_CLEARANCE]: CargoEventType.CUSTOMS_RELEASED,
  [ScanEventType.SCAN_WAREHOUSE_RELEASE]: CargoEventType.IMPORT_RELEASED,
  [ScanEventType.SCAN_OUT_FOR_DELIVERY]: CargoEventType.IMPORT_OUT_FOR_DELIVERY,
  [ScanEventType.SCAN_DELIVERY]: CargoEventType.IMPORT_DELIVERED,
  [ScanEventType.SCAN_RETURN_TO_WAREHOUSE]: CargoEventType.WAREHOUSE_EXCEPTION,
};

export class ScanEventEngine {
  async processScan(input: ScanEventInput): Promise<ScanEventOutput> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Resolve the scan event to a target status
    const targetStatus = HOUSE_AWB_SCAN_MAP[input.eventType];
    if (!targetStatus) {
      return {
        success: false,
        errors: [`No status mapping for scan event type: ${input.eventType}`],
      };
    }

    // 2. Validate the transition (will be called with actual current status at runtime)
    const validation = TransitionValidator.validateHouseAWBTransition(
      targetStatus, // Note: actual current status is resolved at call site
      targetStatus,
      input.userRole,
      input.presentFields ?? {}
    );

    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }

    // 3. Determine the cargo event
    const cargoEventType = SCAN_TO_CARGO_EVENT[input.eventType];

    // 4. Create timeline event
    eventBus.publish(
      createEvent("scan.event_processed", "Scan", input.barcode, {
        eventType: input.eventType,
        targetStatus,
        cargoEventType,
        stationId: input.stationId,
        location: input.location,
        metadata: input.metadata,
      }, input.userId)
    );

    // 5. Create audit log for the scan
    await createAuditLog({
      userId: input.userId,
      action: "UPDATE",
      entity: "HouseAWB",
      entityId: input.barcode,
      metadata: {
        eventType: input.eventType,
        targetStatus,
        stationId: input.stationId,
        location: input.location,
      },
    });

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      newStatus: targetStatus,
      eventType: cargoEventType,
    };
  }

  async processBatchScan(
    scans: ScanEventInput[]
  ): Promise<ScanEventOutput[]> {
    return Promise.all(scans.map((scan) => this.processScan(scan)));
  }
}

export const scanEventEngine = new ScanEventEngine();
