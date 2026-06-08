import { HouseAWBStatus, CargoEventType } from "@/types/cargo-domain";

export interface ExportTransition {
  from: HouseAWBStatus;
  to: HouseAWBStatus;
  event: CargoEventType;
  requiredFields: string[];
  allowedRoles: string[];
}

export const EXPORT_TRANSITIONS: ExportTransition[] = [
  {
    from: HouseAWBStatus.EXPORT_CREATED,
    to: HouseAWBStatus.EXPORT_PICKUP_ASSIGNED,
    event: CargoEventType.EXPORT_PICKUP_ASSIGNED,
    requiredFields: ["driverId", "pickupAddress"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_PICKUP_ASSIGNED,
    to: HouseAWBStatus.EXPORT_PICKED_UP,
    event: CargoEventType.EXPORT_PICKED_UP,
    requiredFields: ["pickupTimestamp", "driverId"],
    allowedRoles: ["DRIVER", "WAREHOUSE_OFFICER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_PICKED_UP,
    to: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
    event: CargoEventType.EXPORT_AT_ORIGIN_WAREHOUSE,
    requiredFields: ["warehouseId", "receivedBy"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
    to: HouseAWBStatus.EXPORT_CONSOLIDATED,
    event: CargoEventType.EXPORT_CONSOLIDATED,
    requiredFields: ["masterAWBId"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_CONSOLIDATED,
    to: HouseAWBStatus.EXPORT_CUSTOMS_DECLARATION_SUBMITTED,
    event: CargoEventType.EXPORT_CUSTOMS_DECLARATION_SUBMITTED,
    requiredFields: ["declarationId"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_CUSTOMS_DECLARATION_SUBMITTED,
    to: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: [],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.EXPORT_CLEARED,
    event: CargoEventType.CUSTOMS_APPROVED,
    requiredFields: ["clearedBy"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.EXPORT_CUSTOMS_HOLD,
    event: CargoEventType.CUSTOMS_HOLD_ISSUED,
    requiredFields: ["holdReason"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_CUSTOMS_HOLD,
    to: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["holdResolution"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.EXPORT_CUSTOMS_QUERY,
    event: CargoEventType.CUSTOMS_QUERY_ISSUED,
    requiredFields: ["queryDetails"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_CUSTOMS_QUERY,
    to: HouseAWBStatus.EXPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["queryResponse"],
    allowedRoles: ["EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_CLEARED,
    to: HouseAWBStatus.EXPORT_RELEASED,
    event: CargoEventType.CUSTOMS_RELEASED,
    requiredFields: ["releasedBy"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_RELEASED,
    to: HouseAWBStatus.EXPORT_MANIFESTED,
    event: CargoEventType.EXPORT_MANIFESTED,
    requiredFields: ["manifestId", "flightNumber"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_MANIFESTED,
    to: HouseAWBStatus.EXPORT_LOADED_TO_AIRLINE,
    event: CargoEventType.EXPORT_LOADED_TO_AIRLINE,
    requiredFields: ["uldNumber", "loadedBy"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_LOADED_TO_AIRLINE,
    to: HouseAWBStatus.EXPORT_IN_TRANSIT,
    event: CargoEventType.EXPORT_IN_TRANSIT,
    requiredFields: ["flightNumber", "departureTime"],
    allowedRoles: ["OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  // Exception transitions (available from most states)
  {
    from: HouseAWBStatus.EXPORT_CREATED,
    to: HouseAWBStatus.EXCEPTION_RETURNED,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["reason"],
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_PICKED_UP,
    to: HouseAWBStatus.EXCEPTION_RETURNED,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["reason"],
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
    to: HouseAWBStatus.EXCEPTION_RETURNED,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["reason"],
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  },
  // Exception to lost/damaged
  {
    from: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
    to: HouseAWBStatus.EXCEPTION_LOST,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["incidentReport"],
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
    to: HouseAWBStatus.EXCEPTION_DAMAGED,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["damageReport", "photoEvidence"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
];

export const EXPORT_TRANSITION_MAP: Record<string, string[]> = {};

for (const t of EXPORT_TRANSITIONS) {
  if (!EXPORT_TRANSITION_MAP[t.from]) EXPORT_TRANSITION_MAP[t.from] = [];
  EXPORT_TRANSITION_MAP[t.from].push(t.to);
}

export function getExportTransitions(
  currentStatus: HouseAWBStatus
): ExportTransition[] {
  return EXPORT_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function isValidExportTransition(
  currentStatus: HouseAWBStatus,
  targetStatus: HouseAWBStatus
): boolean {
  return EXPORT_TRANSITIONS.some(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}

export function getExportTransitionDetails(
  currentStatus: HouseAWBStatus,
  targetStatus: HouseAWBStatus
): ExportTransition | undefined {
  return EXPORT_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}
