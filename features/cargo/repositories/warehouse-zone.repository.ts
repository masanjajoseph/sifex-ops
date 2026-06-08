import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface WarehouseZoneRecord {
  id: string;
  stationId: string;
  code: string;
  name: string;
  type: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class WarehouseZoneRepository {
  async create(data: {
    stationId: string;
    code: string;
    name: string;
    type: string;
    capacity?: number;
  }): Promise<WarehouseZoneRecord> {
    const record = await prisma.warehouseZone.create({
      data: {
        stationId: data.stationId,
        code: data.code,
        name: data.name,
        type: data.type,
        capacity: data.capacity ?? 0,
      },
    });

    return record as unknown as WarehouseZoneRecord;
  }

  async findById(id: string): Promise<WarehouseZoneRecord | null> {
    const record = await prisma.warehouseZone.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as WarehouseZoneRecord | null;
  }

  async findByStation(stationId: string): Promise<WarehouseZoneRecord[]> {
    const records = await prisma.warehouseZone.findMany({
      where: { stationId, deletedAt: null, isActive: true },
      orderBy: { code: "asc" },
    });

    return records as unknown as WarehouseZoneRecord[];
  }

  async update(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      type: string;
      capacity: number;
      isActive: boolean;
    }>
  ): Promise<WarehouseZoneRecord> {
    const record = await prisma.warehouseZone.update({
      where: { id },
      data,
    });

    return record as unknown as WarehouseZoneRecord;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.warehouseZone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const warehouseZoneRepository = new WarehouseZoneRepository();
