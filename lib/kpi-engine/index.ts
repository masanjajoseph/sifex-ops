import { prisma } from "@/lib/prisma";
import { CargoStatus, WorkflowStage } from "@/types/cargo-domain";
import { DeliveryTaskStatus } from "@prisma/client";

export interface LiveKPIs {
  exportToday: number;
  importToday: number;
  warehouseToday: number;
  invoicesToday: number;
  revenueToday: number;
  outstandingAmount: number;
  waitingDelivery: number;
  outForDelivery: number;
  deliveredToday: number;
  cancelled: number;
  averageWarehouseTime: number;
  averageBillingTime: number;
  averageDeliveryTime: number;
  shipmentSuccessRate: number;
  slaPerformance: number;
  totalActiveShipments: number;
  totalShipments: number;
  queueBacklog: number;
  slaBreached: number;
  slaWarning: number;
  slaOnTrack: number;
  activeEscalations: number;
  activeAssignments: number;
  pendingJobs: number;
  failedJobs: number;
  totalDocuments: number;
  unassignedQueueItems: number;
}

export async function getLiveKPIs(): Promise<LiveKPIs> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    exportToday,
    importToday,
    warehouseToday,
    invoicesToday,
    revenueToday,
    outstandingAmount,
    waitingDelivery,
    outForDelivery,
    deliveredToday,
    cancelled,
    avgWarehouseTime,
    avgBillingTime,
    avgDeliveryTime,
    successRate,
    totalActive,
    totalShipments,
    queueBacklog,
    slaBreached,
    slaWarning,
    slaOnTrack,
    activeEscalations,
    activeAssignments,
    pendingJobs,
    failedJobs,
    totalDocuments,
    unassignedQueueItems,
  ] = await Promise.all([
    prisma.masterAWB.count({
      where: { deletedAt: null, workflowStage: "EXPORT" as any, createdAt: { gte: today } },
    }),
    prisma.masterAWB.count({
      where: { deletedAt: null, workflowStage: "IMPORT" as any, createdAt: { gte: today } },
    }),
    prisma.masterAWB.count({
      where: { deletedAt: null, workflowStage: "WAREHOUSE" as any, createdAt: { gte: today } },
    }),
    prisma.billingRecord.count({
      where: { deletedAt: null, createdAt: { gte: today } },
    }),
    prisma.masterAWB.aggregate({
      where: { deletedAt: null, createdAt: { gte: today } },
      _sum: { freight: true },
    }),
    prisma.billingRecord.aggregate({
      where: { deletedAt: null, status: { in: ["WAITING_PAYMENT", "UNPAID", "PARTIAL_PAID"] as any } },
      _sum: { remainingAmount: true },
    }),
    prisma.deliveryTask.count({
      where: { deletedAt: null, status: "WAITING_ASSIGNMENT" as DeliveryTaskStatus },
    }),
    prisma.deliveryTask.count({
      where: { deletedAt: null, status: { in: ["ASSIGNED", "STARTED", "ARRIVED"] as DeliveryTaskStatus[] } },
    }),
    prisma.deliveryTask.count({
      where: { deletedAt: null, status: "DELIVERED" as DeliveryTaskStatus, deliveredAt: { gte: today } },
    }),
    prisma.masterAWB.count({
      where: { deletedAt: null, cargoStatus: "CANCELLED" as CargoStatus },
    }),
    calculateAverageDuration("warehouse"),
    calculateAverageDuration("billing"),
    calculateAverageDuration("delivery"),
    calculateSuccessRate(),
    prisma.masterAWB.count({
      where: { deletedAt: null, cargoStatus: { notIn: ["DELIVERED", "CANCELLED", "POD_SIGNED"] as CargoStatus[] } },
    }),
    prisma.masterAWB.count({ where: { deletedAt: null } }),
    prisma.workQueueItem.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] } } }),
    prisma.sLATracker.count({ where: { status: "BREACHED" } }),
    prisma.sLATracker.count({ where: { status: "WARNING" } }),
    prisma.sLATracker.count({ where: { status: "ON_TRACK" } }),
    prisma.escalation.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] as any } } }),
    prisma.assignment.count({ where: { status: { in: ["ASSIGNED", "STARTED", "ACCEPTED"] } } }),
    prisma.backgroundJob.count({ where: { status: { in: ["PENDING", "QUEUED", "RUNNING"] } } }),
    prisma.backgroundJob.count({ where: { status: "FAILED" } }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.workQueueItem.count({ where: { assignedUserId: null, status: "WAITING" } }),
  ]);

  return {
    exportToday,
    importToday,
    warehouseToday,
    invoicesToday,
    revenueToday: revenueToday._sum.freight || 0,
    outstandingAmount: outstandingAmount._sum.remainingAmount || 0,
    waitingDelivery,
    outForDelivery,
    deliveredToday,
    cancelled,
    averageWarehouseTime: avgWarehouseTime,
    averageBillingTime: avgBillingTime,
    averageDeliveryTime: avgDeliveryTime,
    shipmentSuccessRate: successRate,
    slaPerformance: successRate,
    totalActiveShipments: totalActive,
    totalShipments,
    queueBacklog,
    slaBreached,
    slaWarning,
    slaOnTrack,
    activeEscalations,
    activeAssignments,
    pendingJobs,
    failedJobs,
    totalDocuments,
    unassignedQueueItems,
  };
}

async function calculateAverageDuration(type: string): Promise<number> {
  if (type === "warehouse") {
    const result = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at)) / 3600), 0) as avg_hours
      FROM master_awbs
      WHERE deleted_at IS NULL AND workflow_stage = 'WAREHOUSE'
    `;
    return Math.round(Number(result[0]?.avg_hours || 0) * 10) / 10;
  }
  if (type === "billing") {
    const result = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(fully_paid_at, updated_at) - created_at)) / 3600), 0) as avg_hours
      FROM billing_records
      WHERE deleted_at IS NULL
    `;
    return Math.round(Number(result[0]?.avg_hours || 0) * 10) / 10;
  }
  if (type === "delivery") {
    const result = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(delivered_at, updated_at) - created_at)) / 3600), 0) as avg_hours
      FROM delivery_tasks
      WHERE deleted_at IS NULL
    `;
    return Math.round(Number(result[0]?.avg_hours || 0) * 10) / 10;
  }
  return 0;
}

async function calculateSuccessRate(): Promise<number> {
  const [delivered, total] = await Promise.all([
    prisma.deliveryTask.count({
      where: { deletedAt: null, status: { in: ["DELIVERED", "COMPLETED"] as DeliveryTaskStatus[] } },
    }),
    prisma.deliveryTask.count({
      where: { deletedAt: null, status: { not: "CANCELLED" as DeliveryTaskStatus } },
    }),
  ]);
  if (total === 0) return 0;
  return Math.round((delivered / total) * 1000) / 10;
}
