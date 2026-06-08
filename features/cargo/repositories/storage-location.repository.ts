import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface StorageLocationRecord {
  id: string;
  zoneId: string;
  code: string;
  barcode: string;
  maxWeight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class StorageLocationRepository {
  async create(data: {
    zoneId: string;
    code: string;
    barcode: string;
    maxWeight?: number;
  }): Promise<StorageLocationRecord> {
    const record = await prisma.storageLocation.create({
      data: {
        zoneId: data.zoneId,
        code: data.code,
        barcode: data.barcode,
        maxWeight: data.maxWeight ?? 0,
      },
    });

    return record as unknown as StorageLocationRecord;
  }

  async findById(id: string): Promise<StorageLocationRecord | null> {
    const record = await prisma.storageLocation.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as StorageLocationRecord | null;
  }

  async findByZone(zoneId: string): Promise<StorageLocationRecord[]> {
    const records = await prisma.storageLocation.findMany({
      where: { zoneId, deletedAt: null, isActive: true },
      orderBy: { code: "asc" },
    });

    return records as unknown as StorageLocationRecord[];
  }

  async findAvailable(zoneId: string): Promise<StorageLocationRecord[]> {
    const occupiedIds = (
      await prisma.warehouseInventory.findMany({
        where: {
          storageLocation: { zoneId },
          deletedAt: null,
          status: { in: ["RECEIVED" as any, "STORED" as any] },
        },
        select: { storageLocationId: true },
        distinct: ["storageLocationId"],
      })
    )
      .map((r) => r.storageLocationId)
      .filter(Boolean) as string[];

    const records = await prisma.storageLocation.findMany({
      where: {
        zoneId,
        deletedAt: null,
        isActive: true,
        id: { notIn: occupiedIds },
        NOT: { inventory: { some: { status: { in: ["RECEIVED" as any, "STORED" as any] } } } },
      },
      orderBy: { code: "asc" },
    });

    return records as unknown as StorageLocationRecord[];
  }

  async update(
    id: string,
    data: Partial<{
      code: string;
      barcode: string;
      maxWeight: number;
      isActive: boolean;
    }>
  ): Promise<StorageLocationRecord> {
    const record = await prisma.storageLocation.update({
      where: { id },
      data,
    });

    return record as unknown as StorageLocationRecord;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.storageLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const storageLocationRepository = new StorageLocationRepository();
