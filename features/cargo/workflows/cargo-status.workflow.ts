import { CargoStatus } from "@/types/cargo-domain";
import { AppError } from "@/lib/errors";

export const CARGO_STATUS_TRANSITIONS: Record<CargoStatus, CargoStatus[]> = {
  [CargoStatus.INITIATED]: [CargoStatus.ACCEPTED, CargoStatus.CANCELLED],
  [CargoStatus.ACCEPTED]: [CargoStatus.RCS, CargoStatus.CANCELLED],
  [CargoStatus.RCS]: [CargoStatus.LOADED, CargoStatus.OFFLOADED, CargoStatus.CANCELLED],
  [CargoStatus.LOADED]: [CargoStatus.MANIFESTED, CargoStatus.OFFLOADED],
  [CargoStatus.MANIFESTED]: [CargoStatus.DEPARTED, CargoStatus.OFFLOADED],
  [CargoStatus.OFFLOADED]: [CargoStatus.LOADED, CargoStatus.MANIFESTED],
  [CargoStatus.DEPARTED]: [CargoStatus.IN_TRANSIT],
  [CargoStatus.IN_TRANSIT]: [CargoStatus.ARRIVED],
  [CargoStatus.ARRIVED]: [CargoStatus.UNDER_CLEARANCE, CargoStatus.RELEASED],
  [CargoStatus.UNDER_CLEARANCE]: [CargoStatus.CUSTOMS_QUERY, CargoStatus.CUSTOMS_HOLD, CargoStatus.RELEASED],
  [CargoStatus.CUSTOMS_QUERY]: [CargoStatus.UNDER_CLEARANCE, CargoStatus.CUSTOMS_HOLD],
  [CargoStatus.CUSTOMS_HOLD]: [CargoStatus.UNDER_CLEARANCE, CargoStatus.CANCELLED],
  [CargoStatus.RELEASED]: [CargoStatus.AWAITING_DELIVERY],
  [CargoStatus.AWAITING_DELIVERY]: [CargoStatus.OUT_FOR_DELIVERY, CargoStatus.PICKED_UP],
  [CargoStatus.OUT_FOR_DELIVERY]: [CargoStatus.DELIVERED],
  [CargoStatus.PICKED_UP]: [CargoStatus.POD_SIGNED],
  [CargoStatus.DELIVERED]: [CargoStatus.POD_SIGNED],
  [CargoStatus.POD_SIGNED]: [],
  [CargoStatus.CANCELLED]: [],
};

export class CargoStatusWorkflow {
  canTransition(from: CargoStatus, to: CargoStatus): boolean {
    return CARGO_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  transition(from: CargoStatus, to: CargoStatus): CargoStatus {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid cargo status transition from ${from} to ${to}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
    return to;
  }

  getAllowedTransitions(status: CargoStatus): CargoStatus[] {
    return [...(CARGO_STATUS_TRANSITIONS[status] ?? [])];
  }

  isTerminal(status: CargoStatus): boolean {
    return CARGO_STATUS_TRANSITIONS[status]?.length === 0;
  }
}
