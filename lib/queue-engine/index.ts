import { prisma } from "@/lib/prisma";
import { publishQueueUpdate, publishToKpiChannel } from "@/lib/realtime/publisher";
import { logger } from "@/lib/logger";

export type QueueCode =
  | "EXPORT_DRAFT" | "EXPORT_VALIDATION" | "EXPORT_HAWB" | "EXPORT_MAWB" | "EXPORT_MANIFEST" | "EXPORT_FLIGHT" | "EXPORT_DISPATCH"
  | "IMPORT_ARRIVAL" | "IMPORT_VERIFICATION" | "IMPORT_RECEIVING" | "IMPORT_WAREHOUSE"
  | "WAREHOUSE_RECEIVING" | "WAREHOUSE_STORAGE" | "WAREHOUSE_INVOICE" | "WAREHOUSE_PAYMENT"
  | "DELIVERY_ASSIGNMENT" | "DELIVERY_DISPATCH" | "DELIVERY_COMPLETION";

const QUEUE_MODULE_MAP: Record<string, string> = {
  EXPORT_DRAFT: "EXPORT", EXPORT_VALIDATION: "EXPORT", EXPORT_HAWB: "EXPORT",
  EXPORT_MAWB: "EXPORT", EXPORT_MANIFEST: "EXPORT", EXPORT_FLIGHT: "EXPORT", EXPORT_DISPATCH: "EXPORT",
  IMPORT_ARRIVAL: "IMPORT", IMPORT_VERIFICATION: "IMPORT", IMPORT_RECEIVING: "IMPORT", IMPORT_WAREHOUSE: "IMPORT",
  WAREHOUSE_RECEIVING: "WAREHOUSE", WAREHOUSE_STORAGE: "WAREHOUSE", WAREHOUSE_INVOICE: "WAREHOUSE", WAREHOUSE_PAYMENT: "WAREHOUSE",
  DELIVERY_ASSIGNMENT: "DELIVERY", DELIVERY_DISPATCH: "DELIVERY", DELIVERY_COMPLETION: "DELIVERY",
};

const STATUS_TO_QUEUE: Record<string, QueueCode> = {
  DRAFT: "EXPORT_DRAFT",
  VALIDATED: "EXPORT_VALIDATION",
  HAWB_GENERATED: "EXPORT_HAWB",
  MAWB_ASSIGNED: "EXPORT_MAWB",
  MANIFEST_CREATED: "EXPORT_MANIFEST",
  FLIGHT_ASSIGNED: "EXPORT_FLIGHT",
  DISPATCHED: "EXPORT_DISPATCH",
  IN_TRANSIT: "IMPORT_ARRIVAL",
  RECEIVED: "IMPORT_VERIFICATION",
  VERIFIED: "IMPORT_RECEIVING",
  WAREHOUSE_RECEIVING: "WAREHOUSE_RECEIVING",
  AWAITING_STORAGE: "WAREHOUSE_STORAGE",
  STORED: "WAREHOUSE_INVOICE",
  INVOICE_GENERATED: "WAREHOUSE_INVOICE",
  WAITING_PAYMENT: "WAREHOUSE_PAYMENT",
  PAID: "DELIVERY_ASSIGNMENT",
  WAITING_DELIVERY: "DELIVERY_ASSIGNMENT",
  WAITING_ASSIGNMENT: "DELIVERY_ASSIGNMENT",
  ASSIGNED: "DELIVERY_DISPATCH",
  STARTED: "DELIVERY_DISPATCH",
  ARRIVED: "DELIVERY_DISPATCH",
  DELIVERED: "DELIVERY_COMPLETION",
};

function calculatePriorityScore(priority: string, isVip: boolean, weight: number, isDangerous: boolean): number {
  let score = 0;
  const priorityMap: Record<string, number> = { LOW: 10, NORMAL: 20, HIGH: 30, CRITICAL: 40, VIP: 50 };
  score += priorityMap[priority] || 20;
  if (isVip) score += 30;
  if (weight > 500) score += 10;
  if (isDangerous) score += 20;
  return score;
}

async function ensureQueueExists(code: string, module: string, departmentId?: string | null): Promise<string> {
  const existing = await prisma.workQueue.findFirst({ where: { code } });
  if (existing) return existing.id;

  const q = await prisma.workQueue.create({
    data: {
      queueNumber: `Q-${code}`,
      name: code.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      code,
      module,
      departmentId: departmentId || undefined,
      status: "ACTIVE",
      priority: "NORMAL",
    },
  });
  return q.id;
}

export async function enqueueEntity(
  entityType: string,
  entityId: string,
  entityNumber: string | null | undefined,
  workflowStatus: string,
  reference?: string,
  priority?: string,
  isVip?: boolean,
  weight?: number,
  isDangerous?: boolean,
  departmentId?: string | null,
): Promise<void> {
  try {
    const queueCode = STATUS_TO_QUEUE[workflowStatus];
    if (!queueCode) {
      logger.warn(`No queue mapping for status ${workflowStatus}`, undefined, "QueueEngine");
      return;
    }

    const module = QUEUE_MODULE_MAP[queueCode];
    const queueId = await ensureQueueExists(queueCode, module, departmentId);

    const existing = await prisma.workQueueItem.findFirst({
      where: { queueId, entityType, entityId, status: { in: ["WAITING", "ASSIGNED", "IN_PROGRESS"] } },
    });
    if (existing) return;

    const maxPos = await prisma.workQueueItem.aggregate({
      where: { queueId },
      _max: { position: true },
    });
    const position = (maxPos._max.position || 0) + 1;
    const resolvedPriority = (priority as any) || "NORMAL";

    await prisma.workQueueItem.create({
      data: {
        queueId,
        position,
        status: "WAITING",
        priority: resolvedPriority,
        priorityScore: calculatePriorityScore(resolvedPriority, isVip || false, weight || 0, isDangerous || false),
        entityType,
        entityId,
        entityNumber: entityNumber || undefined,
        reference,
        enqueuedAt: new Date(),
      },
    });

    await publishQueueUpdate(module, { queueCode, action: "enqueue", entityType, entityId, entityNumber });
    await publishToKpiChannel({ event: "queue_update", module, queueCode, action: "enqueue" });
  } catch (error) {
    logger.error("Failed to enqueue entity", error as Error, "QueueEngine");
  }
}

export async function dequeueEntity(
  entityType: string,
  entityId: string,
  userId: string,
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "CANCELLED" = "ASSIGNED",
): Promise<void> {
  const item = await prisma.workQueueItem.findFirst({
    where: { entityType, entityId, status: "WAITING" },
    include: { queue: true },
  });
  if (!item) return;

  const now = new Date();
  const waitTime = Math.floor((now.getTime() - item.enqueuedAt.getTime()) / 1000);

  await prisma.workQueueItem.update({
    where: { id: item.id },
    data: {
      status,
      assignedUserId: userId,
      assignedAt: status === "ASSIGNED" ? now : undefined,
      startedAt: status === "IN_PROGRESS" ? now : undefined,
      completedAt: status === "COMPLETED" ? now : undefined,
      waitTime,
    },
  });

  await publishQueueUpdate(item.queue.module, { queueCode: item.queue.code, action: "dequeue", itemId: item.id, status });
}

export async function getQueueItems(
  queueCode: string,
  status?: string,
  limit = 20,
  offset = 0,
  assignee?: string,
) {
  const queue = await prisma.workQueue.findFirst({ where: { code: queueCode } });
  if (!queue) return { items: [], total: 0, queue: null };

  const where: any = { queueId: queue.id };
  if (status) where.status = status;
  if (assignee) where.assignedUserId = assignee;

  const [items, total] = await Promise.all([
    prisma.workQueueItem.findMany({
      where,
      orderBy: [{ priorityScore: "desc" }, { position: "asc" }],
      skip: offset,
      take: limit,
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        queue: true,
      },
    }),
    prisma.workQueueItem.count({ where }),
  ]);

  return { items, total, queue };
}

export async function getDepartmentQueues(departmentCode: string) {
  return prisma.workQueue.findMany({
    where: {
      department: { code: departmentCode },
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          items: { where: { status: "WAITING" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getQueueKpis() {
  const queues = await prisma.workQueue.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      _count: {
        select: {
          items: { where: { status: "WAITING" } },
        },
      },
    },
  });

  const waitingByModule: Record<string, number> = {};
  for (const q of queues) {
    waitingByModule[q.module] = (waitingByModule[q.module] || 0) + q._count.items;
  }

  return { totalQueues: queues.length, waitingByModule, queues };
}

export async function skipQueueItem(itemId: string, reason: string): Promise<void> {
  await prisma.workQueueItem.update({
    where: { id: itemId },
    data: { status: "SKIPPED", notes: reason },
  });
}

export { STATUS_TO_QUEUE, QUEUE_MODULE_MAP };
