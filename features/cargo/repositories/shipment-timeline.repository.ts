import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface ShipmentTimelineRecord {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  title: string;
  description: string | null;
  userId: string;
  stationId: string | null;
  visibility: string;
  metadata: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: Date;
}

export class ShipmentTimelineRepository {
  async create(data: {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    title: string;
    description?: string;
    userId: string;
    stationId?: string;
    visibility: string;
    metadata?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
    address?: string;
  }): Promise<ShipmentTimelineRecord> {
    const record = await prisma.shipmentTimeline.create({
      data: {
        aggregateId: data.aggregateId,
        aggregateType: data.aggregateType,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        userId: data.userId,
        stationId: data.stationId,
        visibility: data.visibility,
        metadata: data.metadata as any,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
    });

    return record as unknown as ShipmentTimelineRecord;
  }

  async findByAggregate(
    aggregateId: string,
    aggregateType: string,
    options: {
      visibility?: string;
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ShipmentTimelineRecord[]> {
    const where: Prisma.ShipmentTimelineWhereInput = {
      aggregateId,
      aggregateType,
    };

    if (options.visibility) {
      where.visibility = options.visibility;
    }

    if (options.fromDate || options.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      where.eventType = { in: options.eventTypes };
    }

    const records = await prisma.shipmentTimeline.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });

    return records as unknown as ShipmentTimelineRecord[];
  }
}

export const shipmentTimelineRepository = new ShipmentTimelineRepository();
