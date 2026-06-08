import { WarehouseInventoryStatus, CargoEventType } from "@/types/cargo-domain";

export interface WarehouseTransition {
  from: WarehouseInventoryStatus;
  to: WarehouseInventoryStatus;
  event: CargoEventType;
  requiredFields: string[];
  allowedRoles: string[];
}

export const WAREHOUSE_TRANSITIONS: WarehouseTransition[] = [
  {
    from: WarehouseInventoryStatus.RECEIVED,
    to: WarehouseInventoryStatus.STORED,
    event: CargoEventType.WAREHOUSE_STORED,
    requiredFields: ["location", "storedBy"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.STORED,
    to: WarehouseInventoryStatus.CONSOLIDATED,
    event: CargoEventType.WAREHOUSE_CONSOLIDATED,
    requiredFields: ["masterAWBId"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.CONSOLIDATED,
    to: WarehouseInventoryStatus.MANIFESTED,
    event: CargoEventType.WAREHOUSE_MANIFESTED,
    requiredFields: ["manifestId"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.MANIFESTED,
    to: WarehouseInventoryStatus.READY_FOR_DISPATCH,
    event: CargoEventType.WAREHOUSE_READY_FOR_DISPATCH,
    requiredFields: [],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.READY_FOR_DISPATCH,
    to: WarehouseInventoryStatus.DISPATCHED,
    event: CargoEventType.WAREHOUSE_DISPATCHED,
    requiredFields: ["dispatchedBy", "dispatchTime"],
    allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  // Exception transitions
  {
    from: WarehouseInventoryStatus.STORED,
    to: WarehouseInventoryStatus.HELD,
    event: CargoEventType.WAREHOUSE_HELD,
    requiredFields: ["holdReason"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.HELD,
    to: WarehouseInventoryStatus.STORED,
    event: CargoEventType.WAREHOUSE_STORED,
    requiredFields: ["holdResolution"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.STORED,
    to: WarehouseInventoryStatus.EXCEPTION,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["exceptionType", "incidentReport"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.DISPATCHED,
    to: WarehouseInventoryStatus.EXCEPTION,
    event: CargoEventType.WAREHOUSE_EXCEPTION,
    requiredFields: ["exceptionType", "incidentReport"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: WarehouseInventoryStatus.EXCEPTION,
    to: WarehouseInventoryStatus.STORED,
    event: CargoEventType.WAREHOUSE_STORED,
    requiredFields: ["resolutionDetails"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
];

export const WAREHOUSE_TRANSITION_MAP: Record<string, string[]> = {};

for (const t of WAREHOUSE_TRANSITIONS) {
  if (!WAREHOUSE_TRANSITION_MAP[t.from]) WAREHOUSE_TRANSITION_MAP[t.from] = [];
  WAREHOUSE_TRANSITION_MAP[t.from].push(t.to);
}

export function getWarehouseTransitions(
  currentStatus: WarehouseInventoryStatus
): WarehouseTransition[] {
  return WAREHOUSE_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function isValidWarehouseTransition(
  currentStatus: WarehouseInventoryStatus,
  targetStatus: WarehouseInventoryStatus
): boolean {
  return WAREHOUSE_TRANSITIONS.some(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}
