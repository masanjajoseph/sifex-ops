import { BillingStatus, CargoEventType } from "@/types/cargo-domain";

export interface BillingTransition {
  from: BillingStatus;
  to: BillingStatus;
  event: CargoEventType;
  requiredFields: string[];
  allowedRoles: string[];
}

export const BILLING_TRANSITIONS: BillingTransition[] = [
  {
    from: BillingStatus.NOT_BILLED,
    to: BillingStatus.DRAFT,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: ["charges", "totalAmount"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.DRAFT,
    to: BillingStatus.INVOICED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: ["invoiceNumber", "invoiceDate"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.PARTIAL_PAID,
    event: CargoEventType.BILLING_PARTIAL_PAYMENT,
    requiredFields: ["paymentAmount", "paymentMethod", "paymentReference"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.PAID,
    event: CargoEventType.BILLING_PAID,
    requiredFields: ["paymentAmount", "paymentMethod", "paymentReference"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.INVOICED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: [],
    allowedRoles: ["FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.INVOICED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: ["disputeReason"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.PARTIAL_PAID,
    to: BillingStatus.PAID,
    event: CargoEventType.BILLING_PAID,
    requiredFields: ["paymentAmount", "paymentMethod", "paymentReference"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.PARTIAL_PAID,
    to: BillingStatus.INVOICED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: [],
    allowedRoles: ["FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.PAID,
    event: CargoEventType.BILLING_PAID,
    requiredFields: ["paymentAmount", "paymentMethod", "paymentReference", "lateFee"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.INVOICED,
    to: BillingStatus.INVOICED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: ["disputeResolution"],
    allowedRoles: ["FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.PAID,
    to: BillingStatus.REFUNDED,
    event: CargoEventType.BILLING_REFUND,
    requiredFields: ["refundAmount", "refundReason", "refundReference"],
    allowedRoles: ["FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    from: BillingStatus.NOT_BILLED,
    to: BillingStatus.REFUNDED,
    event: CargoEventType.BILLING_INVOICED,
    requiredFields: ["cancellationReason"],
    allowedRoles: ["BILLING_OFFICER", "FINANCE_MANAGER", "ADMIN", "SUPER_ADMIN"],
  },
];

export function getBillingTransitions(
  currentStatus: BillingStatus
): BillingTransition[] {
  return BILLING_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function isValidBillingTransition(
  currentStatus: BillingStatus,
  targetStatus: BillingStatus
): boolean {
  return BILLING_TRANSITIONS.some(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}

export function getBillingTransitionDetails(
  currentStatus: BillingStatus,
  targetStatus: BillingStatus
): BillingTransition | undefined {
  return BILLING_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus
  );
}
