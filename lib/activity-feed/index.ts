import { prisma } from "@/lib/prisma";
import { eventDispatcher } from "@/lib/events/event-dispatcher";
import { EventType } from "@/lib/events/event-types";
import { createEvent } from "@/lib/events/event-bus";
import { publish } from "@/lib/realtime";
import { CHANNELS, EVENTS } from "@/lib/realtime/channels";

export interface ActivityFeedEntryInput {
  eventType: string;
  title: string;
  description?: string;
  entityType: string;
  entityId: string;
  entityNumber?: string;
  userId: string;
  userName: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  workflowStage?: string;
  oldStatus?: string;
  newStatus?: string;
  action?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

export async function createActivityFeedEntry(input: ActivityFeedEntryInput): Promise<void> {
  const entry = await prisma.activityFeedEntry.create({
    data: {
      eventType: input.eventType,
      title: input.title,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId,
      entityNumber: input.entityNumber,
      userId: input.userId,
      userName: input.userName,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      branchId: input.branchId,
      branchName: input.branchName,
      workflowStage: input.workflowStage,
      oldStatus: input.oldStatus,
      newStatus: input.newStatus,
      action: input.action,
      priority: input.priority || "NORMAL",
      metadata: input.metadata as any,
    },
  });

  await publish(CHANNELS.ACTIVITY_FEED, EVENTS.UPDATED, entry);

  await eventDispatcher.dispatch(
    createEvent(
      EventType.ACTIVITY_FEED_CREATED,
      input.entityType,
      input.entityId,
      { ...input, feedEntryId: entry.id } as any,
      input.userId,
    ),
  );
}

export interface GetActivityFeedParams {
  limit?: number;
  cursor?: string;
  entityType?: string;
  entityId?: string;
  departmentId?: string;
  userId?: string;
  eventType?: string;
  priority?: string;
  from?: Date;
  to?: Date;
}

export async function getActivityFeed(params: GetActivityFeedParams = {}) {
  const { limit = 50, cursor, entityType, entityId, departmentId, userId, eventType, priority, from, to } = params;

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (departmentId) where.departmentId = departmentId;
  if (userId) where.userId = userId;
  if (eventType) where.eventType = eventType;
  if (priority) where.priority = priority;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [entries, total] = await Promise.all([
    prisma.activityFeedEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.activityFeedEntry.count({ where }),
  ]);

  const hasMore = entries.length > limit;
  const data = hasMore ? entries.slice(0, limit) : entries;

  return {
    data,
    total,
    hasMore,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1].id : undefined,
  };
}

export async function getActivityFeedSummary(params: { departmentId?: string; since?: Date }) {
  const since = params.since || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where: any = { createdAt: { gte: since } };
  if (params.departmentId) where.departmentId = params.departmentId;

  const [byEventType, byUser, total] = await Promise.all([
    prisma.activityFeedEntry.groupBy({
      by: ["eventType"],
      _count: true,
      where,
      orderBy: { _count: { eventType: "desc" } },
    }),
    prisma.activityFeedEntry.groupBy({
      by: ["userId", "userName"],
      _count: true,
      where,
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
    prisma.activityFeedEntry.count({ where }),
  ]);

  return { total, byEventType, byUser };
}

export async function getEntityActivityFeed(entityType: string, entityId: string, limit = 20) {
  return getActivityFeed({ entityType, entityId, limit });
}

export async function getDepartmentActivityFeed(departmentId: string, limit = 50) {
  return getActivityFeed({ departmentId, limit });
}
