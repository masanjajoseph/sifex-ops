import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";
import { WorkflowStage } from "@/types/cargo-domain";
import { eventBus, createEvent } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";

const CARGO_STATUS_TO_WORKFLOW_STAGE: Record<CargoStatus, WorkflowStage> = {
  [CargoStatus.INITIATED]: WorkflowStage.EXPORT,
  [CargoStatus.ACCEPTED]: WorkflowStage.EXPORT,
  [CargoStatus.RCS]: WorkflowStage.EXPORT,
  [CargoStatus.LOADED]: WorkflowStage.EXPORT,
  [CargoStatus.MANIFESTED]: WorkflowStage.EXPORT,
  [CargoStatus.OFFLOADED]: WorkflowStage.EXPORT,
  [CargoStatus.DEPARTED]: WorkflowStage.EXPORT,
  [CargoStatus.IN_TRANSIT]: WorkflowStage.EXPORT,
  [CargoStatus.ARRIVED]: WorkflowStage.IMPORT,
  [CargoStatus.UNDER_CLEARANCE]: WorkflowStage.IMPORT,
  [CargoStatus.CUSTOMS_QUERY]: WorkflowStage.IMPORT,
  [CargoStatus.CUSTOMS_HOLD]: WorkflowStage.IMPORT,
  [CargoStatus.RELEASED]: WorkflowStage.WAREHOUSE,
  [CargoStatus.AWAITING_DELIVERY]: WorkflowStage.DELIVERY,
  [CargoStatus.OUT_FOR_DELIVERY]: WorkflowStage.DELIVERY,
  [CargoStatus.PICKED_UP]: WorkflowStage.DELIVERY,
  [CargoStatus.DELIVERED]: WorkflowStage.COMPLETED,
  [CargoStatus.POD_SIGNED]: WorkflowStage.COMPLETED,
  [CargoStatus.CANCELLED]: WorkflowStage.COMPLETED,
};

function deriveWorkflowStage(cargoStatus: CargoStatus): WorkflowStage {
  return CARGO_STATUS_TO_WORKFLOW_STAGE[cargoStatus] ?? WorkflowStage.EXPORT;
}

export async function syncWorkflowStage(
  entityType: "MasterAWB" | "HouseAWB",
  entityId: string,
  cargoStatus: CargoStatus,
  userId: string,
): Promise<WorkflowStage> {
  const newStage = deriveWorkflowStage(cargoStatus);

  let existingStageStr: string | null = null;

  if (entityType === "MasterAWB") {
    const record = await prisma.masterAWB.findUnique({
      where: { id: entityId },
      select: { workflowStage: true },
    });
    existingStageStr = record?.workflowStage ?? null;
  } else {
    const record = await prisma.houseAWB.findUnique({
      where: { id: entityId },
      select: { workflowStage: true },
    });
    existingStageStr = record?.workflowStage ?? null;
  }

  if (!existingStageStr || existingStageStr === newStage) return newStage;

  if (entityType === "MasterAWB") {
    await prisma.masterAWB.update({
      where: { id: entityId },
      data: { workflowStage: newStage as any },
    });
  } else {
    await prisma.houseAWB.update({
      where: { id: entityId },
      data: { workflowStage: newStage as any },
    });
  }

  await createAuditLog({
    userId,
    action: "UPDATE",
    entity: entityType,
    entityId,
    metadata: {
      field: "workflowStage",
      oldValue: existingStageStr,
      newValue: newStage,
      triggeredBy: `cargoStatus changed to ${cargoStatus}`,
    },
  });

  await eventBus.publish(
    createEvent(
      "workflow.stage_changed",
      entityType,
      entityId,
      {
        entityType,
        entityId,
        oldStage: existingStageStr,
        newStage,
        cargoStatus,
      },
      userId,
    ),
  );

  return newStage;
}

export async function syncChildWorkflowStages(
  masterAWBId: string,
  cargoStatus: CargoStatus,
  userId: string,
): Promise<void> {
  const newStage = deriveWorkflowStage(cargoStatus);

  const { count } = await prisma.houseAWB.updateMany({
    where: { masterAWBId, deletedAt: null, workflowStage: { not: newStage } },
    data: { workflowStage: newStage },
  });

  if (count > 0) {
    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "HouseAWB",
      entityId: masterAWBId,
      metadata: {
        field: "workflowStage",
        newValue: newStage,
        affectedCount: count,
        triggeredBy: `MasterAWB ${masterAWBId} cargoStatus changed to ${cargoStatus}`,
      },
    });
  }
}

export async function syncWorkflowStageOnStatusChange(
  entityType: "MasterAWB" | "HouseAWB",
  entityId: string,
  cargoStatus: CargoStatus,
  userId: string,
): Promise<void> {
  await syncWorkflowStage(entityType, entityId, cargoStatus, userId);

  if (entityType === "MasterAWB") {
    await syncChildWorkflowStages(entityId, cargoStatus, userId);
  }
}
