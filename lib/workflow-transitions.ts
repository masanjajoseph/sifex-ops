// Phase 2: Workflow Transition Rules Engine
// Defines all valid state transitions and their validation rules

import {
  ShipmentStatus,
  DeliveryStatus,
  BillingStatus,
  WarehouseStatus,
  UserRole,
  EventType,
  WorkflowTransition,
  TransitionValidation,
} from "@/types/domain-engines";

// ============================================================================
// SHIPMENT STATUS TRANSITIONS
// ============================================================================

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, WorkflowTransition[]> = {
  [ShipmentStatus.CREATED]: [
    {
      from: ShipmentStatus.CREATED,
      to: ShipmentStatus.PENDING_PICKUP,
      requiredFields: ["recipientAddress", "items", "originWarehouseId"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_UPDATED,
      notificationEvent: "SHIPMENT_READY_FOR_PICKUP",
    },
    {
      from: ShipmentStatus.CREATED,
      to: ShipmentStatus.CANCELLED,
      requiredFields: ["reason"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.CUSTOMER_SERVICE],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE, WarehouseStatus.MAINTENANCE],
      auditEvent: EventType.SHIPMENT_CANCELLED,
      billingTrigger: {
        id: "",
        type: "SURCHARGE",
        amount: 0, // Calculated based on shipment value
        description: "Cancellation fee",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_CANCELLED",
    },
  ],

  [ShipmentStatus.PENDING_PICKUP]: [
    {
      from: ShipmentStatus.PENDING_PICKUP,
      to: ShipmentStatus.PICKED_UP,
      requiredFields: ["driverId", "vehicleId", "pickupTimestamp"],
      requiredRole: [UserRole.DRIVER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_PICKED_UP,
      billingTrigger: {
        id: "",
        type: "PICKUP",
        amount: 0, // Calculated based on weight/distance
        description: "Pickup fee",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_PICKED_UP",
    },
    {
      from: ShipmentStatus.PENDING_PICKUP,
      to: ShipmentStatus.CANCELLED,
      requiredFields: ["reason"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.CUSTOMER_SERVICE],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE, WarehouseStatus.MAINTENANCE],
      auditEvent: EventType.SHIPMENT_CANCELLED,
      notificationEvent: "SHIPMENT_CANCELLED",
    },
  ],

  [ShipmentStatus.PICKED_UP]: [
    {
      from: ShipmentStatus.PICKED_UP,
      to: ShipmentStatus.IN_TRANSIT,
      requiredFields: ["departureTimestamp", "route"],
      requiredRole: [UserRole.DRIVER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_IN_TRANSIT,
      billingTrigger: {
        id: "",
        type: "TRANSIT",
        amount: 0, // Calculated based on distance
        description: "Transit fee",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_IN_TRANSIT",
    },
  ],

  [ShipmentStatus.IN_TRANSIT]: [
    {
      from: ShipmentStatus.IN_TRANSIT,
      to: ShipmentStatus.AT_WAREHOUSE,
      requiredFields: ["warehouseId", "arrivalTimestamp"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.DRIVER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_AT_WAREHOUSE,
      billingTrigger: {
        id: "",
        type: "STORAGE",
        amount: 0, // Calculated per day
        description: "Storage fee",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_AT_WAREHOUSE",
    },
    {
      from: ShipmentStatus.IN_TRANSIT,
      to: ShipmentStatus.OUT_FOR_DELIVERY,
      requiredFields: ["deliveryDriverId", "deliveryVehicleId"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_OUT_FOR_DELIVERY,
      notificationEvent: "SHIPMENT_OUT_FOR_DELIVERY",
    },
    {
      from: ShipmentStatus.IN_TRANSIT,
      to: ShipmentStatus.EXCEPTION,
      requiredFields: ["exceptionType", "incidentReport"],
      requiredRole: [UserRole.DRIVER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE, WarehouseStatus.MAINTENANCE],
      auditEvent: EventType.SHIPMENT_EXCEPTION_REPORTED,
      notificationEvent: "SHIPMENT_EXCEPTION",
    },
  ],

  [ShipmentStatus.AT_WAREHOUSE]: [
    {
      from: ShipmentStatus.AT_WAREHOUSE,
      to: ShipmentStatus.IN_TRANSIT,
      requiredFields: ["departureTimestamp", "nextRoute"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.WAREHOUSE_DISPATCHED,
      notificationEvent: "SHIPMENT_RESUMED_TRANSIT",
    },
    {
      from: ShipmentStatus.AT_WAREHOUSE,
      to: ShipmentStatus.EXCEPTION,
      requiredFields: ["exceptionType", "incidentReport"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_EXCEPTION_REPORTED,
      notificationEvent: "SHIPMENT_EXCEPTION",
    },
  ],

  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    {
      from: ShipmentStatus.OUT_FOR_DELIVERY,
      to: ShipmentStatus.DELIVERED,
      requiredFields: ["deliveryTimestamp", "recipientConfirmation"],
      requiredRole: [UserRole.DRIVER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_DELIVERED,
      billingTrigger: {
        id: "",
        type: "DELIVERY",
        amount: 0, // Calculated based on distance
        description: "Delivery fee",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_DELIVERED",
    },
    {
      from: ShipmentStatus.OUT_FOR_DELIVERY,
      to: ShipmentStatus.EXCEPTION,
      requiredFields: ["exceptionType", "incidentReport"],
      requiredRole: [UserRole.DRIVER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_EXCEPTION_REPORTED,
      notificationEvent: "SHIPMENT_EXCEPTION",
    },
  ],

  [ShipmentStatus.DELIVERED]: [
    {
      from: ShipmentStatus.DELIVERED,
      to: ShipmentStatus.SIGNED,
      requiredFields: ["recipientSignature", "confirmationTimestamp"],
      requiredRole: [UserRole.DRIVER, UserRole.CUSTOMER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_SIGNED,
      billingTrigger: {
        id: "",
        type: "SURCHARGE",
        amount: 0, // Finalize all charges
        description: "Delivery finalized",
        appliedAt: new Date(),
      },
      notificationEvent: "SHIPMENT_SIGNED",
    },
    {
      from: ShipmentStatus.DELIVERED,
      to: ShipmentStatus.EXCEPTION,
      requiredFields: ["exceptionType", "incidentReport"],
      requiredRole: [UserRole.CUSTOMER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_EXCEPTION_REPORTED,
      notificationEvent: "SHIPMENT_EXCEPTION",
    },
  ],

  [ShipmentStatus.SIGNED]: [],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.EXCEPTION]: [
    {
      from: ShipmentStatus.EXCEPTION,
      to: ShipmentStatus.IN_TRANSIT,
      requiredFields: ["resolutionDetails"],
      requiredRole: [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_IN_TRANSIT,
      notificationEvent: "SHIPMENT_EXCEPTION_RESOLVED",
    },
    {
      from: ShipmentStatus.EXCEPTION,
      to: ShipmentStatus.CANCELLED,
      requiredFields: ["resolutionDetails"],
      requiredRole: [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.SHIPMENT_CANCELLED,
      notificationEvent: "SHIPMENT_CANCELLED",
    },
  ],
};

// ============================================================================
// DELIVERY STATUS TRANSITIONS
// ============================================================================

function asWorkflowTransitions(t: Record<string, unknown[]>): Record<string, WorkflowTransition[]> { return t as unknown as Record<string, WorkflowTransition[]>; }

export const DELIVERY_TRANSITIONS = asWorkflowTransitions({
  [DeliveryStatus.UNASSIGNED]: [
    {
      from: DeliveryStatus.UNASSIGNED,
      to: DeliveryStatus.ASSIGNED,
      requiredFields: ["driverId", "vehicleId"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_ASSIGNED,
      notificationEvent: "DELIVERY_ASSIGNED",
    },
  ],

  [DeliveryStatus.ASSIGNED]: [
    {
      from: DeliveryStatus.ASSIGNED,
      to: DeliveryStatus.IN_PROGRESS,
      requiredFields: ["startTimestamp"],
      requiredRole: [UserRole.DRIVER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_STARTED,
      notificationEvent: "DELIVERY_STARTED",
    },
  ],

  [DeliveryStatus.IN_PROGRESS]: [
    {
      from: DeliveryStatus.IN_PROGRESS,
      to: DeliveryStatus.COMPLETED,
      requiredFields: ["completionTimestamp", "recipientConfirmation"],
      requiredRole: [UserRole.DRIVER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_COMPLETED,
      notificationEvent: "DELIVERY_COMPLETED",
    },
    {
      from: DeliveryStatus.IN_PROGRESS,
      to: DeliveryStatus.FAILED,
      requiredFields: ["failureReason"],
      requiredRole: [UserRole.DRIVER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_FAILED,
      notificationEvent: "DELIVERY_FAILED",
    },
  ],

  [DeliveryStatus.COMPLETED]: [
    {
      from: DeliveryStatus.COMPLETED,
      to: DeliveryStatus.SIGNED,
      requiredFields: ["recipientSignature"],
      requiredRole: [UserRole.DRIVER, UserRole.CUSTOMER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_COMPLETED,
      notificationEvent: "DELIVERY_SIGNED",
    },
  ],

  [DeliveryStatus.FAILED]: [
    {
      from: DeliveryStatus.FAILED,
      to: DeliveryStatus.REATTEMPT,
      requiredFields: ["nextAttemptTime"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_ASSIGNED,
      notificationEvent: "DELIVERY_REATTEMPT",
    },
    {
      from: DeliveryStatus.FAILED,
      to: DeliveryStatus.RETURN_TO_WAREHOUSE,
      requiredFields: ["returnReason"],
      requiredRole: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_FAILED,
      notificationEvent: "DELIVERY_RETURNED",
    },
  ],

  [DeliveryStatus.REATTEMPT]: [
    {
      from: DeliveryStatus.REATTEMPT,
      to: DeliveryStatus.IN_PROGRESS,
      requiredFields: ["startTimestamp"],
      requiredRole: [UserRole.DRIVER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.DELIVERY_STARTED,
      notificationEvent: "DELIVERY_REATTEMPT_STARTED",
    },
  ],

  [DeliveryStatus.SIGNED]: [],
  [DeliveryStatus.RETURN_TO_WAREHOUSE]: [],
});

// ============================================================================
// BILLING STATUS TRANSITIONS
// ============================================================================

export const BILLING_TRANSITIONS = asWorkflowTransitions({
  [BillingStatus.NOT_BILLED]: [
    {
      from: BillingStatus.NOT_BILLED,
      to: BillingStatus.PENDING,
      requiredFields: ["charges"],
      requiredRole: [UserRole.BILLING_OFFICER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.BILLING_CHARGED,
      notificationEvent: "BILLING_CHARGED",
    },
  ],

  [BillingStatus.PENDING]: [
    {
      from: BillingStatus.PENDING,
      to: BillingStatus.INVOICED,
      requiredFields: ["invoiceNumber"],
      requiredRole: [UserRole.BILLING_OFFICER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.BILLING_INVOICED,
      notificationEvent: "INVOICE_SENT",
    },
    {
      from: BillingStatus.PENDING,
      to: BillingStatus.CANCELLED,
      requiredFields: ["cancellationReason"],
      requiredRole: [UserRole.BILLING_OFFICER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.USER_ACTION,
      notificationEvent: "BILLING_CANCELLED",
    },
  ],

  [BillingStatus.INVOICED]: [
    {
      from: BillingStatus.INVOICED,
      to: BillingStatus.PAID,
      requiredFields: ["paymentAmount", "paymentMethod"],
      requiredRole: [UserRole.BILLING_OFFICER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.BILLING_PAID,
      notificationEvent: "PAYMENT_RECEIVED",
    },
    {
      from: BillingStatus.INVOICED,
      to: BillingStatus.OVERDUE,
      requiredFields: [],
      requiredRole: [UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.USER_ACTION,
      notificationEvent: "INVOICE_OVERDUE",
    },
  ],

  [BillingStatus.OVERDUE]: [
    {
      from: BillingStatus.OVERDUE,
      to: BillingStatus.PAID,
      requiredFields: ["paymentAmount", "paymentMethod"],
      requiredRole: [UserRole.BILLING_OFFICER, UserRole.ADMIN],
      allowedWarehouseStatus: [WarehouseStatus.ACTIVE],
      auditEvent: EventType.BILLING_PAID,
      notificationEvent: "PAYMENT_RECEIVED",
    },
  ],

  [BillingStatus.PAID]: [],
  [BillingStatus.CANCELLED]: [],
});

// ============================================================================
// TRANSITION VALIDATION ENGINE
// ============================================================================

export class TransitionValidator {
  /**
   * Validate if a transition is allowed
   */
  static validateTransition(
    currentStatus: ShipmentStatus,
    targetStatus: ShipmentStatus,
    userRole: UserRole,
    warehouseStatus: WarehouseStatus,
    requiredFieldsPresent: Record<string, boolean>
  ): TransitionValidation {
    const transitions = SHIPMENT_TRANSITIONS[currentStatus];
    const allowedTransition = transitions.find((t) => t.to === targetStatus);

    if (!allowedTransition) {
      return {
        isValid: false,
        errors: [`Transition from ${currentStatus} to ${targetStatus} is not allowed`],
        warnings: [],
        requiredFields: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check role
    if (!allowedTransition.requiredRole.includes(userRole)) {
      errors.push(
        `User role ${userRole} is not allowed for this transition. Required: ${allowedTransition.requiredRole.join(", ")}`
      );
    }

    // Check warehouse status
    if (!allowedTransition.allowedWarehouseStatus.includes(warehouseStatus)) {
      errors.push(
        `Warehouse status ${warehouseStatus} does not allow this transition. Allowed: ${allowedTransition.allowedWarehouseStatus.join(", ")}`
      );
    }

    // Check required fields
    const missingFields = allowedTransition.requiredFields.filter(
      (field) => !requiredFieldsPresent[field]
    );
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFields: allowedTransition.requiredFields,
    };
  }

  /**
   * Get all allowed transitions from current status
   */
  static getAllowedTransitions(
    currentStatus: ShipmentStatus,
    userRole: UserRole
  ): ShipmentStatus[] {
    const transitions = SHIPMENT_TRANSITIONS[currentStatus];
    return transitions
      .filter((t) => t.requiredRole.includes(userRole))
      .map((t) => t.to) as ShipmentStatus[];
  }

  /**
   * Get transition details
   */
  static getTransitionDetails(
    currentStatus: ShipmentStatus,
    targetStatus: ShipmentStatus
  ): WorkflowTransition | null {
    const transitions = SHIPMENT_TRANSITIONS[currentStatus];
    return transitions.find((t) => t.to === targetStatus) || null;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  SHIPMENT_TRANSITIONS,
  DELIVERY_TRANSITIONS,
  BILLING_TRANSITIONS,
  TransitionValidator,
};
