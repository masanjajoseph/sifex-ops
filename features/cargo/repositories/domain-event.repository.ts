import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";

export interface DomainEventRecord {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  data: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
  userId: string | null;
  occurredAt: Date;
}

export class DomainEventRepository {
  async append(data: Omit<DomainEventRecord, "id" | "occurredAt">): Promise<DomainEventRecord> {
    const record = await prisma.domainEvent.create({
      data: data as Prisma.DomainEventCreateInput,
    });

    return record as unknown as DomainEventRecord;
  }

  async findByAggregate(aggregateId: string, aggregateType: string): Promise<DomainEventRecord[]> {
    const records = await prisma.domainEvent.findMany({
      where: { aggregateId, aggregateType },
      orderBy: { version: "asc" },
    });

    return records as unknown as DomainEventRecord[];
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      aggregateType?: string;
      aggregateId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: Prisma.DomainEventWhereInput = {};

    if (options.eventType) where.eventType = options.eventType;
    if (options.aggregateType) where.aggregateType = options.aggregateType;
    if (options.aggregateId) where.aggregateId = options.aggregateId;
    if (options.dateFrom || options.dateTo) {
      where.occurredAt = {};
      if (options.dateFrom) where.occurredAt.gte = options.dateFrom;
      if (options.dateTo) where.occurredAt.lte = options.dateTo;
    }

    return paginate<DomainEventRecord>(
      async (skip, take) => {
        const records = await prisma.domainEvent.findMany({
          where,
          skip,
          take,
          orderBy: { occurredAt: "desc" },
        });
        return records as unknown as DomainEventRecord[];
      },
      () => prisma.domainEvent.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async getLatestVersion(aggregateId: string, aggregateType: string): Promise<number> {
    const latest = await prisma.domainEvent.findFirst({
      where: { aggregateId, aggregateType },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return latest?.version ?? 0;
  }
}

export const domainEventRepository = new DomainEventRepository();
