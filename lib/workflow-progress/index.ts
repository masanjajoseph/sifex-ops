import { prisma } from "@/lib/prisma";
import { WorkflowStage } from "@/types/cargo-domain";

export interface WorkflowStageInfo {
  id: string;
  label: string;
  status: "completed" | "current" | "pending";
  completedAt?: string;
  department?: string;
  user?: string;
}

const STAGE_ORDER: WorkflowStage[] = [
  "EXPORT" as WorkflowStage,
  "IMPORT" as WorkflowStage,
  "WAREHOUSE" as WorkflowStage,
  "DELIVERY" as WorkflowStage,
  "COMPLETED" as WorkflowStage,
];

const STAGE_LABELS: Record<string, string> = {
  BOOKING: "Booking",
  EXPORT: "Export",
  IMPORT: "Import",
  WAREHOUSE: "Warehouse",
  BILLING: "Billing",
  DELIVERY: "Delivery",
  COMPLETED: "Completed",
};

const STATUS_TO_STAGE: Record<string, string> = {
  DRAFT: "EXPORT",
  VALIDATED: "EXPORT",
  HAWB_GENERATED: "EXPORT",
  MAWB_ASSIGNED: "EXPORT",
  MANIFEST_CREATED: "EXPORT",
  FLIGHT_ASSIGNED: "EXPORT",
  DISPATCHED: "EXPORT",
  IN_TRANSIT: "IMPORT",
  RECEIVED: "IMPORT",
  VERIFIED: "IMPORT",
  WAREHOUSE_RECEIVING: "WAREHOUSE",
  AWAITING_STORAGE: "WAREHOUSE",
  STORED: "WAREHOUSE",
  INVOICE_GENERATED: "WAREHOUSE",
  WAITING_PAYMENT: "BILLING",
  PAID: "BILLING",
  WAITING_DELIVERY: "DELIVERY",
  RIDER_ASSIGNED: "DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERY",
  DELIVERED: "DELIVERY",
  COMPLETED: "COMPLETED",
  POD_SIGNED: "COMPLETED",
};

export async function getWorkflowProgress(
  entityType: string,
  entityId: string,
  currentStatus?: string | null,
): Promise<WorkflowStageInfo[]> {
  const [timeline, stageEvents] = await Promise.all([
    prisma.shipmentTimeline.findMany({
      where: { aggregateId: entityId, aggregateType: entityType },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workflowStage: true,
        oldStatus: true,
        newStatus: true,
        action: true,
        createdAt: true,
        userId: true,
        departmentId: true,
      },
    }),
    prisma.shipmentTimeline.findMany({
      where: {
        aggregateId: entityId,
        aggregateType: entityType,
        eventType: { contains: "workflow" },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        eventType: true,
        title: true,
        createdAt: true,
        userId: true,
        departmentId: true,
        workflowStage: true,
      },
    }),
  ]);

  const userIds = [...new Set([
    ...timeline.map(t => t.userId),
    ...stageEvents.map(e => e.userId),
  ])];

  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true, code: true } },
        },
      })
    : [];

  const userMap = new Map(users.map(u => [u.id, u]));

  const completedStageIds = new Set<string>();
  const stageData: Record<string, { completedAt: string; department?: string; userId?: string }> = {};

  for (const event of stageEvents) {
    const stage = event.workflowStage;
    if (stage && !completedStageIds.has(stage)) {
      completedStageIds.add(stage);
      const user = userMap.get(event.userId);
      stageData[stage] = {
        completedAt: event.createdAt.toISOString(),
        department: user?.department?.name || user?.department?.code || undefined,
        userId: event.userId,
      };
    }
  }

  for (const t of timeline) {
    const stage = t.workflowStage;
    if (stage && !completedStageIds.has(stage)) {
      completedStageIds.add(stage);
      const user = userMap.get(t.userId);
      stageData[stage] = {
        completedAt: t.createdAt.toISOString(),
        department: user?.department?.name || user?.department?.code || undefined,
        userId: t.userId,
      };
    }
  }

  const currentStageId = currentStatus
    ? (STATUS_TO_STAGE[currentStatus] || "EXPORT")
    : (stageEvents.length > 0
      ? (stageEvents[stageEvents.length - 1].workflowStage || "EXPORT")
      : "BOOKING");

  const currentIndex = ["BOOKING", ...STAGE_ORDER.map(s => s.toString())].indexOf(currentStageId);

  const stages: WorkflowStageInfo[] = ["BOOKING", ...STAGE_ORDER.map(s => s.toString())].map((stageId, idx) => {
    const isCompleted = completedStageIds.has(stageId) || idx < currentIndex;
    const isCurrent = stageId === currentStageId;
    const data = stageData[stageId];
    const user = data?.userId ? userMap.get(data.userId) : undefined;

    return {
      id: stageId,
      label: STAGE_LABELS[stageId] || stageId,
      status: isCompleted ? "completed" : isCurrent ? "current" : "pending",
      completedAt: data?.completedAt,
      department: data?.department,
      user: user ? `${user.firstName} ${user.lastName}` : undefined,
    };
  });

  return stages;
}
