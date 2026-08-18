import { prisma } from "@/lib/prisma";
import { QueueItemStatus, QueuePriority } from "@prisma/client";

interface InboxSection {
  id: string;
  label: string;
  count: number;
  items: InboxItem[];
  urgent: number;
  overSla: number;
}

interface InboxItem {
  id: string;
  title: string;
  subtitle?: string;
  entityType: string;
  entityId: string;
  entityNumber?: string;
  priority: string;
  status: string;
  waitingTime?: number;
  isOverSla: boolean;
  createdAt: string;
  actions: string[];
}

export async function getWorkInbox(userId: string): Promise<InboxSection[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, department: { select: { code: true } } },
  });

  if (!user?.department?.code) return [];

  const departmentCode = user.department.code;
  const sections: InboxSection[] = [];

  const queueItems = await prisma.workQueueItem.findMany({
    where: {
      queue: {
        department: { code: departmentCode },
        status: "ACTIVE",
      },
      status: "WAITING",
    },
    orderBy: [{ priorityScore: "desc" }, { enqueuedAt: "asc" }],
    take: 50,
    include: {
      queue: { select: { name: true, code: true, module: true } },
    },
  });

  const slaBreaches = await prisma.sLATracker.findMany({
    where: {
      status: { in: ["ACTIVE", "WARNING", "BREACHED"] },
    },
    include: { slaConfig: { select: { name: true, module: true } } },
    orderBy: { targetDeadline: "asc" },
    take: 50,
  });

  const byQueueType: Record<string, typeof queueItems> = {};
  for (const item of queueItems) {
    const key = item.queue.code;
    if (!byQueueType[key]) byQueueType[key] = [];
    byQueueType[key].push(item);
  }

  for (const [queueCode, items] of Object.entries(byQueueType)) {
    const now = Date.now();
    const section: InboxSection = {
      id: queueCode,
      label: items[0]?.queue.name || queueCode.replace(/_/g, " "),
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        title: item.entityNumber || `Item #${item.position}`,
        subtitle: item.reference || undefined,
        entityType: item.entityType,
        entityId: item.entityId,
        entityNumber: item.entityNumber || undefined,
        priority: item.priority,
        status: item.status,
        waitingTime: Math.floor((now - item.enqueuedAt.getTime()) / 60000),
        isOverSla: slaBreaches.some(s => s.entityId === item.entityId),
        createdAt: item.enqueuedAt.toISOString(),
        actions: ["assign", "skip"],
      })),
      urgent: items.filter(i => i.priority === "CRITICAL" || i.priority === "VIP" || i.priority === "HIGH").length,
      overSla: items.filter(i => slaBreaches.some(s => s.entityId === i.entityId)).length,
    };
    sections.push(section);
  }

  if (slaBreaches.length > 0) {
    const breachSection: InboxSection = {
      id: "sla_breaches",
      label: "SLA Breaches",
      count: slaBreaches.length,
      items: slaBreaches.slice(0, 20).map(s => ({
        id: s.id,
        title: `SLA: ${s.slaConfig.name}`,
        subtitle: `Status: ${s.status}`,
        entityType: "SLATracker",
        entityId: s.id,
        priority: s.status === "BREACHED" ? "CRITICAL" : s.status === "WARNING" ? "HIGH" : "NORMAL",
        status: s.status,
        isOverSla: true,
        createdAt: s.createdAt.toISOString(),
        actions: ["view", "escalate"],
      })),
      urgent: slaBreaches.filter(s => s.status === "BREACHED").length,
      overSla: slaBreaches.length,
    };
    sections.push(breachSection);
  }

  return sections;
}

export async function getInboxSummary(userId: string) {
  const inbox = await getWorkInbox(userId);
  const total = inbox.reduce((sum, s) => sum + s.count, 0);
  const urgent = inbox.reduce((sum, s) => sum + s.urgent, 0);
  const overSla = inbox.reduce((sum, s) => sum + s.overSla, 0);

  return { sections: inbox, total, urgent, overSla };
}
