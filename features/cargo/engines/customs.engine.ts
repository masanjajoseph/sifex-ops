import { CustomsStatus, CargoEventType } from "@/types/cargo-domain";

export interface CustomsTransition {
  from: CustomsStatus;
  to: CustomsStatus;
  event: CargoEventType;
  requiredFields: string[];
  allowedRoles: string[];
}

export const CUSTOMS_TRANSITIONS: CustomsTransition[] = [
  {
    from: CustomsStatus.DECLARED,
    to: CustomsStatus.UNDER_REVIEW,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: [],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.UNDER_REVIEW,
    to: CustomsStatus.APPROVED,
    event: CargoEventType.CUSTOMS_APPROVED,
    requiredFields: ["approvedBy"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.UNDER_REVIEW,
    to: CustomsStatus.HOLD,
    event: CargoEventType.CUSTOMS_HOLD_ISSUED,
    requiredFields: ["holdReason", "holdLevel"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.UNDER_REVIEW,
    to: CustomsStatus.QUERY_ISSUED,
    event: CargoEventType.CUSTOMS_QUERY_ISSUED,
    requiredFields: ["queryDetails", "respondBy"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.UNDER_REVIEW,
    to: CustomsStatus.MANUAL_INSPECTION,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["inspectionReason"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.HOLD,
    to: CustomsStatus.UNDER_REVIEW,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["holdResolution"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.QUERY_ISSUED,
    to: CustomsStatus.QUERY_RESPONDED,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["response", "respondedBy"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.QUERY_RESPONDED,
    to: CustomsStatus.UNDER_REVIEW,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: [],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.MANUAL_INSPECTION,
    to: CustomsStatus.UNDER_REVIEW,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["inspectionReport"],
    allowedRoles: ["IMPORT_OFFICER", "EXPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.APPROVED,
    to: CustomsStatus.RELEASED,
    event: CargoEventType.CUSTOMS_RELEASED,
    requiredFields: ["releasedBy", "releaseOrder"],
    allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.APPROVED,
    to: CustomsStatus.ESCALATED,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["escalationReason", "escalatedTo"],
    allowedRoles: ["OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: CustomsStatus.RELEASED,
    to: CustomsStatus.UNDER_REVIEW,
    event: CargoEventType.CUSTOMS_UNDER_REVIEW,
    requiredFields: ["recallReason"],
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  },
];

export function getCustomsTransitions(
  currentStatus: CustomsStatus
): CustomsTransition[] {
  return CUSTOMS_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function isValidCustomsTransition(
  currentStatus: CustomsStatus,
  targetStatus: CustomsStatus
): boolean {
  return CUSTOMS_TRANSITIONS.some(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}

export function getCustomsTransitionDetails(
  currentStatus: CustomsStatus,
  targetStatus: CustomsStatus
): CustomsTransition | undefined {
  return CUSTOMS_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}
