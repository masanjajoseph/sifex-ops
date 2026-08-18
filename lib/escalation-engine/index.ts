import { prisma } from "@/lib/prisma";
import { publishToKpiChannel, publishEscalationUpdate } from "@/lib/realtime/publisher";
import { sendCrossModuleNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

interface CreateEscalationParams {
  entityType: string;
  entityId: string;
  entityNumber?: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: string;
  slaTrackerId?: string;
  ruleId?: string;
  assignedToId?: string;
  deadlineMinutes?: number;
}

export async function createEscalation(params: CreateEscalationParams): Promise<string | null> {
  try {
    const count = await prisma.escalation.count();
    const escalationNumber = `ESC-${String(count + 1).padStart(6, "0")}`;

    const deadline = params.deadlineMinutes
      ? new Date(Date.now() + params.deadlineMinutes * 60 * 1000)
      : null;

    const escalation = await prisma.escalation.create({
      data: {
        escalationNumber,
        entityType: params.entityType,
        entityId: params.entityId,
        entityNumber: params.entityNumber,
        reason: params.reason,
        severity: params.severity as any,
        source: params.source,
        slaTrackerId: params.slaTrackerId,
        ruleId: params.ruleId,
        ownerId: params.assignedToId,
        deadlineAt: deadline,
        status: "OPEN",
        currentLevel: "LEVEL_1",
      },
    });

    await sendCrossModuleNotification({
      fromModule: "SYSTEM",
      toModule: "MANAGEMENT",
      eventType: "ESCALATION_CREATED",
      entityType: params.entityType,
      entityId: params.entityId,
      message: `Escalation: ${params.reason} (${params.severity})`,
      userId: params.assignedToId || "system",
      priority: params.severity === "CRITICAL" ? "CRITICAL" : params.severity === "HIGH" ? "HIGH" : "NORMAL",
      metadata: { escalationNumber, severity: params.severity, source: params.source },
    });

    await publishToKpiChannel({
      event: "escalation_created",
      escalationNumber,
      severity: params.severity,
      source: params.source,
    });

    await publishEscalationUpdate({ action: "created", escalationNumber, severity: params.severity, entityType: params.entityType, entityId: params.entityId });

    return escalation.id;
  } catch (error) {
    logger.error("Failed to create escalation", error as Error, "EscalationEngine");
    return null;
  }
}

export async function escalateToNextLevel(
  escalationId: string,
  userId: string,
  note?: string,
): Promise<boolean> {
  const escalation = await prisma.escalation.findUnique({ where: { id: escalationId } });
  if (!escalation) return false;

  const levelOrder = ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"];
  const currentIdx = levelOrder.indexOf(escalation.currentLevel);
  if (currentIdx >= levelOrder.length - 1) return false;

  const nextLevel = levelOrder[currentIdx + 1] as any;

  await prisma.$transaction([
    prisma.escalationAction.create({
      data: {
        escalationId,
        action: "ESCALATE",
        fromLevel: escalation.currentLevel,
        toLevel: nextLevel,
        note: note || `Escalated from ${escalation.currentLevel} to ${nextLevel}`,
        userId,
      },
    }),
    prisma.escalation.update({
      where: { id: escalationId },
      data: {
        currentLevel: nextLevel,
        status: "OPEN",
      },
    }),
  ]);

  await publishEscalationUpdate({ action: "escalated", escalationId, fromLevel: escalation.currentLevel, toLevel: nextLevel });

  return true;
}

export async function acknowledgeEscalation(
  escalationId: string,
  userId: string,
  note?: string,
): Promise<void> {
  await prisma.escalationAction.create({
    data: {
      escalationId,
      action: "ACKNOWLEDGE",
      note: note || "Acknowledged",
      userId,
    },
  });

  await prisma.escalation.update({
    where: { id: escalationId },
    data: { status: "ACKNOWLEDGED" },
  });

  await publishEscalationUpdate({ action: "acknowledged", escalationId });
}

export async function resolveEscalation(
  escalationId: string,
  userId: string,
  resolution: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.escalationAction.create({
      data: { escalationId, action: "RESOLVE", note: resolution, userId },
    }),
    prisma.escalation.update({
      where: { id: escalationId },
      data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
    }),
  ]);

  await publishEscalationUpdate({ action: "resolved", escalationId });
}

export async function getEscalations(
  status?: string,
  severity?: string,
  limit = 20,
  offset = 0,
) {
  const where: any = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;

  const [items, total] = await Promise.all([
    prisma.escalation.findMany({
      where,
      orderBy: [
        { severity: "asc" as any },
        { createdAt: "desc" },
      ],
      skip: offset,
      take: limit,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        actions: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.escalation.count({ where }),
  ]);

  return { items, total };
}

export async function getEscalationSummary() {
  const [open, acknowledged, inProgress, resolved, closed] = await Promise.all([
    prisma.escalation.count({ where: { status: "OPEN" } }),
    prisma.escalation.count({ where: { status: "ACKNOWLEDGED" } }),
    prisma.escalation.count({ where: { status: "IN_PROGRESS" } }),
    prisma.escalation.count({ where: { status: "RESOLVED" } }),
    prisma.escalation.count({ where: { status: "CLOSED" } }),
  ]);

  return { open, acknowledged, inProgress, resolved, closed, total: open + acknowledged + inProgress };
}
