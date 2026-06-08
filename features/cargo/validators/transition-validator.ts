import { HouseAWBStatus, MasterAWBStatus, WarehouseInventoryStatus, CustomsStatus, BillingStatus } from "@/types/cargo-domain";
import { EXPORT_TRANSITIONS } from "../engines/export.engine";
import { IMPORT_TRANSITIONS } from "../engines/import.engine";
import { WAREHOUSE_TRANSITIONS } from "../engines/warehouse.engine";
import { CUSTOMS_TRANSITIONS } from "../engines/customs.engine";
import { BILLING_TRANSITIONS } from "../engines/billing.engine";

export interface TransitionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiredFields: string[];
  allowedRoles: string[];
}

export class TransitionValidator {
  static validateHouseAWBTransition(
    currentStatus: HouseAWBStatus,
    targetStatus: HouseAWBStatus,
    userRole: string,
    presentFields: Record<string, boolean>
  ): TransitionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const exportTransition = EXPORT_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );
    const importTransition = IMPORT_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    const transition = exportTransition || importTransition;

    if (!transition) {
      return {
        valid: false,
        errors: [`Transition from ${currentStatus} to ${targetStatus} is not defined`],
        warnings: [],
        requiredFields: [],
        allowedRoles: [],
      };
    }

    if (!transition.allowedRoles.includes(userRole)) {
      errors.push(
        `Role ${userRole} not authorized. Required: ${transition.allowedRoles.join(", ")}`
      );
    }

    const missingFields = transition.requiredFields.filter((f) => !presentFields[f]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Business rule validations
    if (targetStatus === HouseAWBStatus.EXPORT_MANIFESTED && !presentFields["manifestId"]) {
      errors.push("A manifest reference is required before manifesting");
    }

    if (targetStatus === HouseAWBStatus.IMPORT_DELIVERED) {
      if (!presentFields["deliveryTimestamp"]) {
        errors.push("Delivery timestamp is required");
      }
      if (!presentFields["recipientName"]) {
        errors.push("Recipient name is required");
      }
    }

    if (targetStatus === HouseAWBStatus.EXCEPTION_RETURNED && !presentFields["reason"]) {
      errors.push("Return reason is required");
    }

    if (targetStatus === HouseAWBStatus.EXCEPTION_DAMAGED) {
      if (!presentFields["damageReport"]) errors.push("Damage report is required");
      if (!presentFields["photoEvidence"]) warnings.push("Photo evidence recommended for damage claims");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiredFields: transition.requiredFields,
      allowedRoles: transition.allowedRoles,
    };
  }

  static validateMasterAWBTransition(
    currentStatus: MasterAWBStatus,
    targetStatus: MasterAWBStatus,
    userRole: string,
    presentFields: Record<string, boolean>
  ): TransitionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const MASTER_TRANSITIONS: Record<string, { to: MasterAWBStatus; requiredFields: string[]; allowedRoles: string[] }[]> = {
      [MasterAWBStatus.CREATED]: [
        { to: MasterAWBStatus.CONSOLIDATING, requiredFields: [], allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.CONSOLIDATING]: [
        { to: MasterAWBStatus.CONSOLIDATED, requiredFields: [], allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.CONSOLIDATED]: [
        { to: MasterAWBStatus.MANIFESTED, requiredFields: ["manifestId", "manifestNumber"], allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.MANIFESTED]: [
        { to: MasterAWBStatus.LOADED_TO_AIRLINE, requiredFields: ["uldNumber"], allowedRoles: ["WAREHOUSE_OFFICER", "WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.LOADED_TO_AIRLINE]: [
        { to: MasterAWBStatus.DEPARTED, requiredFields: ["departureTime"], allowedRoles: ["OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.DEPARTED]: [
        { to: MasterAWBStatus.IN_TRANSIT, requiredFields: [], allowedRoles: ["OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
        { to: MasterAWBStatus.ARRIVED, requiredFields: ["arrivalTime"], allowedRoles: ["OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.IN_TRANSIT]: [
        { to: MasterAWBStatus.ARRIVED, requiredFields: ["arrivalTime"], allowedRoles: ["WAREHOUSE_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.ARRIVED]: [
        { to: MasterAWBStatus.CUSTOMS_CLEARANCE, requiredFields: ["declarationId"], allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
        { to: MasterAWBStatus.CLEARED, requiredFields: ["clearedBy"], allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.CUSTOMS_CLEARANCE]: [
        { to: MasterAWBStatus.CLEARED, requiredFields: ["clearedBy", "clearanceDate"], allowedRoles: ["IMPORT_OFFICER", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
        { to: MasterAWBStatus.CLOSED, requiredFields: [], allowedRoles: ["ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.CLEARED]: [
        { to: MasterAWBStatus.RELEASED, requiredFields: ["releasedBy"], allowedRoles: ["WAREHOUSE_SUPERVISOR", "OPERATIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      ],
      [MasterAWBStatus.RELEASED]: [
        { to: MasterAWBStatus.CLOSED, requiredFields: [], allowedRoles: ["WAREHOUSE_SUPERVISOR", "ADMIN", "SUPER_ADMIN"] },
      ],
    };

    const allowed = MASTER_TRANSITIONS[currentStatus]?.find((t) => t.to === targetStatus);

    if (!allowed) {
      return {
        valid: false,
        errors: [`Transition from ${currentStatus} to ${targetStatus} is not allowed`],
        warnings: [],
        requiredFields: [],
        allowedRoles: [],
      };
    }

    if (!allowed.allowedRoles.includes(userRole)) {
      errors.push(`Role ${userRole} not authorized. Required: ${allowed.allowedRoles.join(", ")}`);
    }

    const missingFields = allowed.requiredFields.filter((f) => !presentFields[f]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiredFields: allowed.requiredFields,
      allowedRoles: allowed.allowedRoles,
    };
  }

  static validateWarehouseTransition(
    currentStatus: WarehouseInventoryStatus,
    targetStatus: WarehouseInventoryStatus,
    userRole: string,
    presentFields: Record<string, boolean>
  ): TransitionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const transition = WAREHOUSE_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return {
        valid: false,
        errors: [`Warehouse transition from ${currentStatus} to ${targetStatus} is not allowed`],
        warnings: [],
        requiredFields: [],
        allowedRoles: [],
      };
    }

    if (!transition.allowedRoles.includes(userRole)) {
      errors.push(`Role ${userRole} not authorized`);
    }

    const missingFields = transition.requiredFields.filter((f) => !presentFields[f]);
    if (missingFields.length > 0) {
      errors.push(`Missing: ${missingFields.join(", ")}`);
    }

    return { valid: errors.length === 0, errors, warnings, requiredFields: transition.requiredFields, allowedRoles: transition.allowedRoles };
  }

  static validateCustomsTransition(
    currentStatus: CustomsStatus,
    targetStatus: CustomsStatus,
    userRole: string,
    presentFields: Record<string, boolean>
  ): TransitionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const transition = CUSTOMS_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return {
        valid: false,
        errors: [`Customs transition from ${currentStatus} to ${targetStatus} is not allowed`],
        warnings: [],
        requiredFields: [],
        allowedRoles: [],
      };
    }

    if (!transition.allowedRoles.includes(userRole)) {
      errors.push(`Role ${userRole} not authorized`);
    }

    const missingFields = transition.requiredFields.filter((f) => !presentFields[f]);
    if (missingFields.length > 0) {
      errors.push(`Missing: ${missingFields.join(", ")}`);
    }

    return { valid: errors.length === 0, errors, warnings, requiredFields: transition.requiredFields, allowedRoles: transition.allowedRoles };
  }

  static validateBillingTransition(
    currentStatus: BillingStatus,
    targetStatus: BillingStatus,
    userRole: string,
    presentFields: Record<string, boolean>
  ): TransitionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const transition = BILLING_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      return {
        valid: false,
        errors: [`Billing transition from ${currentStatus} to ${targetStatus} is not allowed`],
        warnings: [],
        requiredFields: [],
        allowedRoles: [],
      };
    }

    if (!transition.allowedRoles.includes(userRole)) {
      errors.push(`Role ${userRole} not authorized`);
    }

    const missingFields = transition.requiredFields.filter((f) => !presentFields[f]);
    if (missingFields.length > 0) {
      errors.push(`Missing: ${missingFields.join(", ")}`);
    }

    return { valid: errors.length === 0, errors, warnings, requiredFields: transition.requiredFields, allowedRoles: transition.allowedRoles };
  }
}
