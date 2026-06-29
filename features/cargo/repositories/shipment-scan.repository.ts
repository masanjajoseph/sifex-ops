import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface ShipmentScanRecord {
  id: string;
  eventType: string;
  barcode: string;
  houseAWBId: string | null;
  masterAWBId: string | null;
  userId: string;
  stationId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  success: boolean;
  errorMessage: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

export class ShipmentScanRepository {
  async save(data: Omit<ShipmentScanRecord, "createdAt">): Promise<ShipmentScanRecord> {
    const record = await prisma.shipmentScan.create({
      data: data as any,
    });

    return record as unknown as ShipmentScanRecord;
  }

  async findById(id: string): Promise<ShipmentScanRecord | null> {
    const record = await prisma.shipmentScan.findUnique({
      where: { id },
    });

    return record as unknown as ShipmentScanRecord | null;
  }

  async findByBarcode(barcode: string): Promise<ShipmentScanRecord[]> {
    const records = await prisma.shipmentScan.findMany({
      where: { barcode },
      orderBy: { createdAt: "desc" },
    });

    return records as unknown as ShipmentScanRecord[];
  }

  async findByEntity(entity: { houseAWBId?: string; masterAWBId?: string }): Promise<ShipmentScanRecord[]> {
    const where: Prisma.ShipmentScanWhereInput = {};

    if (entity.houseAWBId) where.houseAWBId = entity.houseAWBId;
    if (entity.masterAWBId) where.masterAWBId = entity.masterAWBId;

    const records = await prisma.shipmentScan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return records as unknown as ShipmentScanRecord[];
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      stationId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: Prisma.ShipmentScanWhereInput = {};

    if (options.eventType) where.eventType = options.eventType;
    if (options.stationId) where.stationId = options.stationId;
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    return paginate<ShipmentScanRecord>(
      async (skip, take) => {
        const records = await prisma.shipmentScan.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        });
        return records as unknown as ShipmentScanRecord[];
      },
      () => prisma.shipmentScan.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.shipmentScan.findUnique({ where: { id } });
    if (!existing) throw new AppError("Shipment scan not found", 404, "NOT_FOUND");

    await prisma.shipmentScan.update({
      where: { id },
      data: { success: false },
    });
  }
}

export const shipmentScanRepository = new ShipmentScanRepository();
