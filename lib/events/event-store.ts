import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createEvent, DomainEvent } from "./event-bus";

export type DomainEventRecord = Prisma.DomainEventGetPayload<{}>;

export type AppendEventInput = {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
  userId?: string | null;
  correlationId?: string;
  causationId?: string;
};

export class EventStore {
  async append(event: AppendEventInput): Promise<DomainEventRecord> {
    const latestVersion = await this.getLatestVersion(
      event.aggregateId,
      event.aggregateType,
    );

    return prisma.domainEvent.create({
      data: {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        version: latestVersion + 1,
        data: event.data as Prisma.InputJsonValue,
        metadata: {
          ...(event.metadata as Record<string, unknown> || {}),
          correlationId: event.correlationId,
          causationId: event.causationId,
        } as Prisma.InputJsonValue,
        userId: event.userId ?? null,
      },
    });
  }

  async appendFromDomainEvent(event: DomainEvent): Promise<DomainEventRecord> {
    const latestVersion = await this.getLatestVersion(
      event.aggregateId,
      event.aggregateType,
    );

    return prisma.domainEvent.create({
      data: {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        version: latestVersion + 1,
        data: event.payload as Prisma.InputJsonValue,
        metadata: {
          correlationId: event.correlationId,
          causationId: event.causationId,
          ...event.metadata,
        } as Prisma.InputJsonValue,
        userId: event.userId ?? null,
      },
    });
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
  ): Promise<DomainEventRecord[]> {
    return prisma.domainEvent.findMany({
      where: { aggregateId, aggregateType },
      orderBy: { version: "asc" },
    });
  }

  async getEventsByType(
    eventType: string,
    options?: { limit?: number; offset?: number; cursor?: string; from?: Date; to?: Date },
  ): Promise<DomainEventRecord[]> {
    const where: any = { eventType };
    if (options?.from || options?.to) {
      where.occurredAt = {};
      if (options.from) where.occurredAt.gte = options.from;
      if (options.to) where.occurredAt.lte = options.to;
    }
    return prisma.domainEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: options?.limit || 100,
      skip: options?.offset,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async getLatestVersion(
    aggregateId: string,
    aggregateType: string,
  ): Promise<number> {
    const last = await prisma.domainEvent.findFirst({
      where: { aggregateId, aggregateType },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return last?.version ?? 0;
  }

  async replay(
    aggregateId: string,
    aggregateType: string,
  ): Promise<DomainEventRecord[]> {
    return this.getEvents(aggregateId, aggregateType);
  }

  async replayAll(eventType: string, handler: (event: DomainEventRecord) => Promise<void>): Promise<number> {
    let cursor: string | undefined;
    let count = 0;
    for (;;) {
      const events = await prisma.domainEvent.findMany({
        where: { eventType },
        orderBy: { occurredAt: "asc" },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (events.length === 0) break;
      for (const event of events) {
        await handler(event);
        count++;
      }
      cursor = events[events.length - 1].id;
    }
    return count;
  }

  async getFailedEvents(limit = 50): Promise<DomainEventRecord[]> {
    return prisma.domainEvent.findMany({
      where: {
        metadata: {
          path: ["status"],
          equals: "FAILED",
        },
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  }
}

export const eventStore = new EventStore();
