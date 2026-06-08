import { BillingStatus } from "@/types/cargo-domain";
import { AppError } from "@/lib/errors";

export const BILLING_STATUS_TRANSITIONS: Record<BillingStatus, BillingStatus[]> = {
  [BillingStatus.NOT_BILLED]: [BillingStatus.DRAFT],
  [BillingStatus.DRAFT]: [BillingStatus.INVOICED],
  [BillingStatus.INVOICED]: [BillingStatus.PARTIAL_PAID, BillingStatus.PAID],
  [BillingStatus.PARTIAL_PAID]: [BillingStatus.PAID],
  [BillingStatus.PAID]: [BillingStatus.REFUNDED],
  [BillingStatus.REFUNDED]: [],
};

export class BillingStatusWorkflow {
  canTransition(from: BillingStatus, to: BillingStatus): boolean {
    return BILLING_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  transition(from: BillingStatus, to: BillingStatus): BillingStatus {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid billing status transition from ${from} to ${to}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
    return to;
  }

  getAllowedTransitions(status: BillingStatus): BillingStatus[] {
    return [...(BILLING_STATUS_TRANSITIONS[status] ?? [])];
  }

  isTerminal(status: BillingStatus): boolean {
    return BILLING_STATUS_TRANSITIONS[status]?.length === 0;
  }
}
