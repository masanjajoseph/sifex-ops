import { prisma } from "@/lib/prisma";
import { publishToKpiChannel, publishSLAUpdate } from "@/lib/realtime/publisher";
import { logger } from "@/lib/logger";
import { createEscalation } from "@/lib/escalation-engine";

const SLA_STATUS_MAP: Record<string, string> = {
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
};

export async function startSLATracking(
  entityType: string,
  entityId: string,
  entityNumber: string | null | undefined,
  workflowStatus: string,
): Promise<void> {
  try {
    const workflowStage = SLA_STATUS_MAP[workflowStatus] || "EXPORT";
    const configs = await prisma.sLAConfig.findMany({
      where: {
        module: workflowStage,
        isActive: true,
        OR: [
          { fromStatus: workflowStatus },
          { fromStatus: null },
        ],
      },
    });

    for (const config of configs) {
      const existing = await prisma.sLATracker.findFirst({
        where: {
          slaConfigId: config.id,
          entityType,
          entityId,
          status: { in: ["ACTIVE", "WARNING"] },
        },
      });
      if (existing) continue;

      const now = new Date();
      const deadline = new Date(now.getTime() + config.targetMinutes * 60 * 1000);
      const warningAt = config.warningMinutes > 0
        ? new Date(now.getTime() + config.warningMinutes * 60 * 1000)
        : null;

      await prisma.sLATracker.create({
        data: {
          slaConfigId: config.id,
          entityType,
          entityId,
          entityNumber: entityNumber || undefined,
          startedAt: now,
          targetDeadline: deadline,
          warningAt,
          status: "ACTIVE",
        },
      });
    }

    await publishSLAUpdate({ action: "tracking_started", entityType, entityId, workflowStatus, workflowStage });
  } catch (error) {
    logger.error("Failed to start SLA tracking", error as Error, "SLAEngine");
  }
}

export async function completeSLATracking(
  entityType: string,
  entityId: string,
): Promise<void> {
  const trackers = await prisma.sLATracker.findMany({
    where: {
      entityType,
      entityId,
      status: { in: ["ACTIVE", "WARNING"] },
    },
    include: { slaConfig: true },
  });

  for (const tracker of trackers) {
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - tracker.startedAt.getTime()) / 1000);
    const breached = now > tracker.targetDeadline;

    await prisma.sLATracker.update({
      where: { id: tracker.id },
      data: {
        status: breached ? "BREACHED" : "COMPLETED",
        completedAt: now,
        durationSeconds,
        breachedAt: breached ? now : null,
        breachReason: breached ? "Completed after SLA deadline" : null,
      },
    });

    await publishSLAUpdate({ action: "tracking_completed", entityType, entityId });
  }
}

export async function checkSLAAlerts(): Promise<void> {
  const now = new Date();

  const trackers = await prisma.sLATracker.findMany({
    where: {
      status: "ACTIVE",
      targetDeadline: { lte: now },
    },
    include: { slaConfig: true },
  });

  for (const tracker of trackers) {
    await prisma.sLATracker.update({
      where: { id: tracker.id },
      data: {
        status: "BREACHED",
        breachedAt: now,
        breachReason: "SLA deadline exceeded",
      },
    });

    await createEscalation({
      entityType: tracker.entityType,
      entityId: tracker.entityId,
      entityNumber: tracker.entityNumber || undefined,
      reason: `SLA breach: ${tracker.slaConfig.name}`,
      severity: tracker.slaConfig.severity === "CRITICAL" ? "CRITICAL" : tracker.slaConfig.severity === "HIGH" ? "HIGH" : tracker.slaConfig.severity === "MEDIUM" ? "MEDIUM" : "LOW",
      source: "SLA_BREACH",
      slaTrackerId: tracker.id,
    });

    await publishToKpiChannel({
      event: "sla_breach",
      entityType: tracker.entityType,
      entityId: tracker.entityId,
      slaConfig: tracker.slaConfig.code,
    });
  }

  const warnings = await prisma.sLATracker.findMany({
    where: {
      status: "ACTIVE",
      warningAt: { lte: now, not: null },
    },
  });

  for (const w of warnings) {
    await prisma.sLATracker.update({
      where: { id: w.id },
      data: { status: "WARNING" },
    });
  }
}

export async function getSLAStatus(
  entityType: string,
  entityId: string,
) {
  const trackers = await prisma.sLATracker.findMany({
    where: { entityType, entityId },
    include: { slaConfig: true },
    orderBy: { createdAt: "desc" },
  });

  return trackers.map(t => ({
    id: t.id,
    slaName: t.slaConfig.name,
    module: t.slaConfig.module,
    targetMinutes: t.slaConfig.targetMinutes,
    status: t.status,
    startedAt: t.startedAt.toISOString(),
    targetDeadline: t.targetDeadline.toISOString(),
    completedAt: t.completedAt?.toISOString() || null,
    durationSeconds: t.durationSeconds,
    breachedAt: t.breachedAt?.toISOString() || null,
    remainingSeconds: t.status === "ACTIVE" || t.status === "WARNING"
      ? Math.max(0, Math.floor((t.targetDeadline.getTime() - Date.now()) / 1000))
      : 0,
  }));
}

export async function getSLASummary() {
  const [active, warning, breached, completed, total] = await Promise.all([
    prisma.sLATracker.count({ where: { status: "ACTIVE" } }),
    prisma.sLATracker.count({ where: { status: "WARNING" } }),
    prisma.sLATracker.count({ where: { status: "BREACHED" } }),
    prisma.sLATracker.count({ where: { status: "COMPLETED" } }),
    prisma.sLATracker.count(),
  ]);

  const slaPercentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  return { active, warning, breached, completed, total, slaPercentage };
}

export async function getSLAByModule() {
  const configs = await prisma.sLAConfig.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          slaTrackers: {
            where: { status: "BREACHED" },
          },
        },
      },
    },
  });

  return configs.map(c => ({
    id: c.id,
    name: c.name,
    code: c.code,
    module: c.module,
    targetMinutes: c.targetMinutes,
    warningMinutes: c.warningMinutes,
    severity: c.severity,
    breachCount: c._count.slaTrackers,
  }));
}
