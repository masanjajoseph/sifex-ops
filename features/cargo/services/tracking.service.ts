import { prisma } from "@/lib/prisma";
import { Prisma, $Enums } from "@prisma/client";
import { AppError } from "@/lib/errors";

export interface TrackingEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  status: $Enums.CargoStatus;
  title: string;
  description: string | null;
  userId: string;
  stationId: string | null;
  scanSource: string | null;
  remarks: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type CargoStatus = $Enums.CargoStatus;

export class TrackingService {
  async generateMasterTrackingNumber(
    prefix: string,
    stationCode: string
  ): Promise<string> {
    const today = new Date();
    const yyyymmdd =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const pattern = `${prefix}-MAWB-${yyyymmdd}-${stationCode}-`;

    const last = await prisma.masterAWB.findFirst({
      where: {
        trackingNumber: { startsWith: pattern },
      },
      orderBy: { trackingNumber: "desc" },
      select: { trackingNumber: true },
    });

    let seq = 1;
    if (last) {
      const parts = last.trackingNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}-MAWB-${yyyymmdd}-${stationCode}-${String(seq).padStart(4, "0")}`;
  }

  async generateHouseTrackingNumber(prefix: string): Promise<string> {
    const today = new Date();
    const yyyymmdd =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const pattern = `${prefix}-HAWB-${yyyymmdd}-`;

    const last = await prisma.houseAWB.findFirst({
      where: {
        trackingNumber: { startsWith: pattern },
      },
      orderBy: { trackingNumber: "desc" },
      select: { trackingNumber: true },
    });

    let seq = 1;
    if (last) {
      const parts = last.trackingNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}-HAWB-${yyyymmdd}-${String(seq).padStart(6, "0")}`;
  }

  async generateParcelTrackingNumber(
    housePrefix: string,
    parcelIndex: number
  ): Promise<string> {
    const today = new Date();
    const yyyymmdd =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const pattern = `${housePrefix}-PCL-${yyyymmdd}-`;

    const last = await prisma.parcel.findFirst({
      where: {
        parcelTrackingNumber: { startsWith: pattern },
      },
      orderBy: { parcelTrackingNumber: "desc" },
      select: { parcelTrackingNumber: true },
    });

    let seq = 1;
    if (last) {
      const parts = last.parcelTrackingNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${housePrefix}-PCL-${String(seq).padStart(6, "0")}-${String(parcelIndex).padStart(2, "0")}`;
  }

  async createTrackingEvent(params: {
    entityType: string;
    entityId: string;
    eventType: string;
    status: CargoStatus;
    title: string;
    description?: string;
    userId: string;
    stationId?: string;
    scanSource?: string;
    remarks?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const data = {
      entityType: params.entityType,
      entityId: params.entityId,
      eventType: params.eventType,
      status: params.status,
      title: params.title,
      description: params.description ?? null,
      userId: params.userId,
      stationId: params.stationId ?? null,
      scanSource: params.scanSource ?? null,
      remarks: params.remarks ?? null,
      metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
      createdAt: now,
    };

    await prisma.$transaction([
      prisma.trackingEvent.create({ data }),
      prisma.shipmentTimeline.create({
        data: {
          aggregateId: params.entityId,
          aggregateType: params.entityType,
          eventType: params.eventType,
          title: params.title,
          description: params.description ?? null,
          userId: params.userId,
          stationId: params.stationId ?? null,
          visibility: "CUSTOMER",
          metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
          createdAt: now,
        },
      }),
      prisma.domainEvent.create({
        data: {
          aggregateId: params.entityId,
          aggregateType: params.entityType,
          eventType: params.eventType,
          version: 1,
          data: (params.metadata ?? {}) as any,
          metadata: {
            title: params.title,
            status: params.status,
            userId: params.userId,
            stationId: params.stationId,
          } as any,
          userId: params.userId,
          occurredAt: now,
        },
      }),
    ]);
  }

  async getTrackingTimeline(
    entityType: string,
    entityId: string
  ): Promise<TrackingEvent[]> {
    const events = await prisma.trackingEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "asc" },
    });

    return events as unknown as TrackingEvent[];
  }

  async getMasterTracking(masterAWBId: string) {
    const master = await prisma.masterAWB.findUnique({
      where: { id: masterAWBId },
    });

    if (!master) {
      throw new AppError("Master AWB not found", 404, "NOT_FOUND");
    }

    const events = await this.getTrackingTimeline("MasterAWB", masterAWBId);

    const houseAWBs = await prisma.houseAWB.findMany({
      where: { masterAWBId },
      select: { id: true },
    });

    const houseAWBIds = houseAWBs.map((h) => h.id);
    const houseEventPromises = houseAWBIds.map((id) =>
      this.getTrackingTimeline("HouseAWB", id)
    );
    const houseEventsArrays = await Promise.all(houseEventPromises);
    const houseEvents = houseEventsArrays.flat();

    return {
      master: master as unknown as Record<string, unknown>,
      events,
      houseEvents,
    };
  }

  async getHouseTracking(houseAWBId: string) {
    const house = await prisma.houseAWB.findUnique({
      where: { id: houseAWBId },
    });

    if (!house) {
      throw new AppError("House AWB not found", 404, "NOT_FOUND");
    }

    const events = await this.getTrackingTimeline("HouseAWB", houseAWBId);

    return {
      house: house as unknown as Record<string, unknown>,
      events,
    };
  }

  async getTrackingByNumber(
    trackingNumber: string
  ): Promise<{
    entityType: string;
    entityId: string;
    events: TrackingEvent[];
  } | null> {
    const masterAWB = await prisma.masterAWB.findUnique({
      where: { trackingNumber },
    });
    if (masterAWB) {
      const events = await this.getTrackingTimeline(
        "MasterAWB",
        masterAWB.id
      );
      return { entityType: "MasterAWB", entityId: masterAWB.id, events };
    }

    const houseAWB = await prisma.houseAWB.findUnique({
      where: { trackingNumber },
    });
    if (houseAWB) {
      const events = await this.getTrackingTimeline("HouseAWB", houseAWB.id);
      return { entityType: "HouseAWB", entityId: houseAWB.id, events };
    }

    const parcel = await prisma.parcel.findUnique({
      where: { parcelTrackingNumber: trackingNumber },
    });
    if (parcel) {
      const events = await this.getTrackingTimeline("Parcel", parcel.id);
      return { entityType: "Parcel", entityId: parcel.id, events };
    }

    return null;
  }
}

export const trackingService = new TrackingService();
