import { prisma } from "@/lib/prisma";
import { eventBus, createEvent } from "@/lib/events/event-bus";
import { notifyUser } from "@/lib/realtime/publisher";

export interface CrossModuleNotificationParams {
  fromModule: string;
  toModule: string;
  eventType: string;
  entityType: string;
  entityId: string;
  message: string;
  userId: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  category?: string;
  metadata?: Record<string, unknown>;
}

const MODULE_DEPARTMENT_MAP: Record<string, string> = {
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  WAREHOUSE: "WAREHOUSE",
  BILLING: "BILLING",
  DELIVERY: "DELIVERY",
};

const MODULE_CATEGORY_MAP: Record<string, string> = {
  EXPORT: "OPERATIONS",
  IMPORT: "OPERATIONS",
  WAREHOUSE: "WAREHOUSE",
  BILLING: "BILLING",
  DELIVERY: "DELIVERY",
  MANAGEMENT: "EXECUTIVE",
  SECURITY: "SECURITY",
  WORKFLOW: "WORKFLOW",
};

const EVENT_PRIORITY_MAP: Record<string, string> = {
  EXPORT_FLIGHT_DISPATCHED: "HIGH",
  EXPORT_IN_TRANSIT: "HIGH",
  IMPORT_PRE_ARRIVAL: "NORMAL",
  IMPORT_ARRIVED: "HIGH",
  IMPORT_RECEIVED: "HIGH",
  IMPORT_DAMAGE_REPORTED: "CRITICAL",
  IMPORT_MISSING_REPORTED: "CRITICAL",
  IMPORT_CUSTOMS_SUBMITTED: "NORMAL",
  IMPORT_CUSTOMS_HOLD: "CRITICAL",
  IMPORT_CUSTOMS_CLEARED: "HIGH",
  IMPORT_TO_WAREHOUSE: "NORMAL",
  IMPORT_EXCEPTION_RESOLVED: "NORMAL",
  WAREHOUSE_INVOICE_GENERATED: "NORMAL",
  BILLING_PAID: "HIGH",
  DELIVERY_DELIVERED: "NORMAL",
  DELIVERY_COMPLETED: "HIGH",
};

function generateDeepLink(entityType: string, entityId: string): string {
  const routes: Record<string, string> = {
    MasterAWB: `/workspace/master-awb/${entityId}`,
    HouseAWB: `/workspace/export/${entityId}`,
    BillingRecord: `/workspace/billing/${entityId}`,
    Payment: `/workspace/billing/${entityId}`,
    DeliveryTask: `/workspace/delivery/${entityId}`,
    DeliveryAssignment: `/workspace/delivery/${entityId}`,
    Customer: `/workspace/customers/${entityId}`,
    Document: `/workspace/documents/${entityId}`,
    Flight: `/workspace/flights/${entityId}`,
    Manifest: `/workspace/manifests/${entityId}`,
    Escalation: `/workspace/settings`,
    Assignment: `/workspace/delivery`,
  };
  return routes[entityType] || "#";
}

function resolveCategory(fromModule: string, eventType: string, givenCategory?: string): string {
  if (givenCategory) return givenCategory;
  if (eventType.startsWith("sla.") || eventType.startsWith("escalation.") || eventType.startsWith("rule.")) return "WORKFLOW";
  if (eventType.startsWith("auth.") || eventType.startsWith("security.") || eventType.startsWith("permission.")) return "SECURITY";
  return MODULE_CATEGORY_MAP[fromModule] || "OPERATIONS";
}

export async function sendCrossModuleNotification(
  params: CrossModuleNotificationParams,
): Promise<void> {
  const { fromModule, toModule, eventType, entityType, entityId, message, userId, priority, category, metadata } = params;

  const resolvedPriority = (priority || EVENT_PRIORITY_MAP[eventType] || "NORMAL") as "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  const resolvedCategory = resolveCategory(fromModule, eventType, category);

  const targetUsers = await prisma.user.findMany({
    where: toModule !== "MANAGEMENT"
      ? { department: { code: MODULE_DEPARTMENT_MAP[toModule] }, status: "ACTIVE" }
      : {
          userRoles: { some: { role: { code: { in: ["admin", "super_admin"] } } } },
          status: "ACTIVE",
        },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (targetUsers.length === 0) return;

  const deepLink = generateDeepLink(entityType, entityId);

  const notificationData = targetUsers.map((user) => ({
    userId: user.id,
    title: `[${fromModule}] ${message}`,
    message,
    type: eventType,
    category: resolvedCategory,
    priority: resolvedPriority,
    deepLink,
    entityType,
    entityId,
    metadata: {
      fromModule,
      toModule,
      fromUserId: userId,
      ...metadata,
    } as any,
    createdAt: new Date(),
  }));

  await prisma.notification.createMany({ data: notificationData });

  const created = await prisma.notification.findMany({
    where: {
      entityType,
      entityId,
      createdAt: { gte: new Date(Date.now() - 1000) },
    },
    select: { id: true, userId: true, category: true },
    orderBy: { createdAt: "desc" },
    take: targetUsers.length,
  });

  for (const n of created) {
    await notifyUser(n.userId, {
      id: n.id,
      title: `[${fromModule}] ${message}`,
      message,
      type: eventType,
      category: n.category,
      priority: resolvedPriority,
      deepLink,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
  }

  await eventBus.publish(
    createEvent(
      "notification.created",
      entityType,
      entityId,
      {
        fromModule,
        toModule,
        eventType,
        message,
        notificationIds: created.map(n => n.id),
        priority: resolvedPriority,
        category: resolvedCategory,
        deepLink,
        targetCount: targetUsers.length,
        ...metadata,
      },
      userId,
    ),
  );
}

export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  options?: {
    type?: string;
    category?: string;
    priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    deepLink?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: options?.type || "GENERAL",
      category: options?.category || "OPERATIONS",
      priority: (options?.priority as any) || "NORMAL",
      deepLink: options?.deepLink,
      entityType: options?.entityType,
      entityId: options?.entityId,
      metadata: options?.metadata as any,
    },
  });

  await notifyUser(userId, {
    id: notification.id,
    title,
    message,
    type: notification.type,
    category: notification.category,
    priority: notification.priority,
    deepLink: options?.deepLink,
    entityType: options?.entityType,
    entityId: options?.entityId,
    createdAt: notification.createdAt.toISOString(),
  }).catch(() => {});
}

export async function getNotifications(
  userId: string,
  limit = 20,
  offset = 0,
  unreadOnly = false,
) {
  const where: any = { userId };
  if (unreadOnly) where.readAt = null;
  where.archivedAt = null;

  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null, archivedAt: null } }),
  ]);

  return { notifications, total, unread };
}

export async function getNotificationsByCategory(
  userId: string,
  category: string,
  limit = 20,
  offset = 0,
) {
  const where: any = { userId, category, archivedAt: null };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function acknowledgeNotification(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { acknowledgedAt: new Date(), readAt: new Date() },
  });
}

export async function archiveNotification(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { archivedAt: new Date() },
  });
}

export async function archiveAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: { not: null }, archivedAt: null },
    data: { archivedAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null, archivedAt: null },
  });
}

export async function getNotificationCategories(userId: string) {
  const categories = await prisma.notification.groupBy({
    by: ["category"],
    _count: true,
    where: { userId, archivedAt: null },
    orderBy: { _count: { category: "desc" } },
  });
  return categories.map(c => ({ category: c.category, count: c._count }));
}

export async function getUnreadByCategory(userId: string) {
  const categories = await prisma.notification.groupBy({
    by: ["category"],
    _count: true,
    where: { userId, readAt: null, archivedAt: null },
  });
  return categories.map(c => ({ category: c.category, count: c._count }));
}
