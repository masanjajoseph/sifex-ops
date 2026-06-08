import { HouseAWBStatus, CargoEventType } from "@/types/cargo-domain";

export interface ImportTransition {
  from: HouseAWBStatus;
  to: HouseAWBStatus;
  event: CargoEventType;
  requiredFields: string[];
  allowedRoles: string[];
}

export const IMPORT_TRANSITIONS: ImportTransition[] = [
  {
    from: HouseAWBStatus.EXPORT_IN_TRANSIT,
    to: HouseAWBStatus.IMPORT_ARRIVED_AT_HUB,
    event: CargoEventType.IMPORT_ARRIVED_AT_HUB,
    requiredFields: ["arrivalTime", "flightNumber"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_ARRIVED_AT_HUB,
    to: HouseAWBStatus.IMPORT_CUSTOMS_DECLARATION_SUBMITTED,
    event: CargoEventType.IMPORT_CUSTOMS_DECLARATION_SUBMITTED,
    requiredFields: ["declarationId"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_CUSTOMS_DECLARATION_SUBMITTED,
    to: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: [],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.IMPORT_CLEARED,
    event: CargoEventType.CUSTOMS_APPROVED,
    requiredFields: ["clearedBy"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.IMPORT_CUSTOMS_HOLD,
    event: CargoEventType.CUSTOMS_HOLD_ISSUED,
    requiredFields: ["holdReason"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_CUSTOMS_HOLD,
    to: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["holdResolution"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    to: HouseAWBStatus.IMPORT_CUSTOMS_QUERY,
    event: CargoEventType.CUSTOMS_QUERY_ISSUED,
    requiredFields: ["queryDetails"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_CUSTOMS_QUERY,
    to: HouseAWBStatus.IMPORT_UNDER_CLEARANCE,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["queryResponse"],
    allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_CLEARED,
    to: HouseAWBStatus.IMPORT_RELEASED,
    event: CargoEventType.CUSTOMS_RELEASED,
    requiredFields: ["releasedBy"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_RELEASED,
    to: HouseAWBStatus.IMPORT_AT_DESTINATION_WAREHOUSE,
    event: CargoEventType.IMPORT_AT_DESTINATION_WAREHOUSE,
    requiredFields: ["warehouseId", "location"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_AT_DESTINATION_WAREHOUSE,
    to: HouseAWBStatus.IMPORT_READY_FOR_DELIVERY,
    event: CargoEventType.IMPORT_READY_FOR_DELIVERY,
    requiredFields: [],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_READY_FOR_DELIVERY,
    to: HouseAWBStatus.IMPORT_OUT_FOR_DELIVERY,
    event: CargoEventType.IMPORT_OUT_FOR_DELIVERY,
    requiredFields: ["driverId", "vehicleId"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN", "RIDER"],
  },
  {
    from: HouseAWBStatus.IMPORT_OUT_FOR_DELIVERY,
    to: HouseAWBStatus.IMPORT_DELIVERED,
    event: CargoEventType.IMPORT_DELIVERED,
    requiredFields: ["deliveryTimestamp", "recipientName"],
    allowedRoles: ["RIDER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: HouseAWBStatus.IMPORT_DELIVERED,
    to: HouseAWBStatus.IMPORT_SIGNED,
    event: CargoEventType.IMPORT_SIGNED,
    requiredFields: ["recipientSignature", "podPhoto"],
    allowedRoles: ["RIDER", "ADMIN", "SUPER_ADMIN"],
  },
];

export const IMPORT_TRANSITION_MAP: Record<string, string[]> = {};

for (const t of IMPORT_TRANSITIONS) {
  if (!IMPORT_TRANSITION_MAP[t.from]) IMPORT_TRANSITION_MAP[t.from] = [];
  IMPORT_TRANSITION_MAP[t.from].push(t.to);
}

export function getImportTransitions(
  currentStatus: HouseAWBStatus
): ImportTransition[] {
  return IMPORT_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function isValidImportTransition(
  currentStatus: HouseAWBStatus,
  targetStatus: HouseAWBStatus
): boolean {
  return IMPORT_TRANSITIONS.some(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}

export function getImportTransitionDetails(
  currentStatus: HouseAWBStatus,
  targetStatus: HouseAWBStatus
): ImportTransition | undefined {
  return IMPORT_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}
