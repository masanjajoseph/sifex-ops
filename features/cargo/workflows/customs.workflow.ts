import { AppError } from "@/lib/errors";

export type CustomsStatusValue =
  | "DECLARED"
  | "UNDER_REVIEW"
  | "CUSTOMS_HOLD"
  | "CUSTOMS_QUERY"
  | "APPROVED"
  | "RELEASED"
  | "REJECTED";

export const CUSTOMS_STATUS_TRANSITIONS: Record<CustomsStatusValue, CustomsStatusValue[]> = {
  DECLARED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["CUSTOMS_HOLD", "CUSTOMS_QUERY", "APPROVED"],
  CUSTOMS_HOLD: ["UNDER_REVIEW"],
  CUSTOMS_QUERY: ["UNDER_REVIEW"],
  APPROVED: ["RELEASED", "REJECTED"],
  RELEASED: [],
  REJECTED: [],
};

export class CustomsStatusWorkflow {
  canTransition(from: CustomsStatusValue, to: CustomsStatusValue): boolean {
    return CUSTOMS_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  transition(from: CustomsStatusValue, to: CustomsStatusValue): CustomsStatusValue {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid customs status transition from ${from} to ${to}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
    return to;
  }

  getAllowedTransitions(status: CustomsStatusValue): CustomsStatusValue[] {
    return [...(CUSTOMS_STATUS_TRANSITIONS[status] ?? [])];
  }

  isTerminal(status: CustomsStatusValue): boolean {
    return CUSTOMS_STATUS_TRANSITIONS[status]?.length === 0;
  }
}
