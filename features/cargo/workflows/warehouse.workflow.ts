import { WarehouseStatus } from "@/types/cargo-domain";
import { AppError } from "@/lib/errors";

export const WAREHOUSE_STATUS_TRANSITIONS: Record<WarehouseStatus, WarehouseStatus[]> = {
  [WarehouseStatus.RECEIVED]: [WarehouseStatus.RACKED],
  [WarehouseStatus.RACKED]: [WarehouseStatus.PICKED, WarehouseStatus.READY_FOR_DISPATCH],
  [WarehouseStatus.PICKED]: [WarehouseStatus.LOADED, WarehouseStatus.READY_FOR_DISPATCH],
  [WarehouseStatus.LOADED]: [WarehouseStatus.OFFLOADED, WarehouseStatus.RELEASED],
  [WarehouseStatus.OFFLOADED]: [WarehouseStatus.RACKED],
  [WarehouseStatus.READY_FOR_DISPATCH]: [WarehouseStatus.DISPATCHED],
  [WarehouseStatus.DISPATCHED]: [WarehouseStatus.LOADED],
  [WarehouseStatus.RELEASED]: [],
};

export class WarehouseStatusWorkflow {
  canTransition(from: WarehouseStatus, to: WarehouseStatus): boolean {
    return WAREHOUSE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  transition(from: WarehouseStatus, to: WarehouseStatus): WarehouseStatus {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid warehouse status transition from ${from} to ${to}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
    return to;
  }

  getAllowedTransitions(status: WarehouseStatus): WarehouseStatus[] {
    return [...(WAREHOUSE_STATUS_TRANSITIONS[status] ?? [])];
  }

  isTerminal(status: WarehouseStatus): boolean {
    return WAREHOUSE_STATUS_TRANSITIONS[status]?.length === 0;
  }
}
