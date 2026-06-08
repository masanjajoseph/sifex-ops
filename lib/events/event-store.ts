import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type DomainEventRecord = Prisma.DomainEventGetPayload<{}>;

export type AppendEventInput = {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
  userId?: string | null;
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
        metadata: (event.metadata ?? null) as Prisma.InputJsonValue | undefined,
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
    options?: { limit?: number; offset?: number },
  ): Promise<DomainEventRecord[]> {
    return prisma.domainEvent.findMany({
      where: { eventType },
      orderBy: { occurredAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
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
}

export const eventStore = new EventStore();
