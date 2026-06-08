import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";

export interface WarehouseInventoryRecord {
  id: string;
  organizationId: string;
  stationId: string;
  storageLocationId: string | null;
  houseAWBId: string | null;
  masterAWBId: string | null;
  status: string;
  quantity: number;
  weight: number;
  volume: number;
  receivedAt: Date;
  storedAt: Date | null;
  dispatchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class WarehouseInventoryRepository {
  async create(data: {
    organizationId: string;
    stationId: string;
    storageLocationId?: string;
    houseAWBId?: string;
    masterAWBId?: string;
    status?: string;
    quantity?: number;
    weight?: number;
    volume?: number;
  }): Promise<WarehouseInventoryRecord> {
    const record = await prisma.warehouseInventory.create({
      data: data as any,
    });

    return record as unknown as WarehouseInventoryRecord;
  }

  async findById(id: string): Promise<WarehouseInventoryRecord | null> {
    const record = await prisma.warehouseInventory.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as WarehouseInventoryRecord | null;
  }

  async findByStation(
    stationId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      search?: string;
    } = {}
  ) {
    const where: Prisma.WarehouseInventoryWhereInput = {
      stationId,
      deletedAt: null,
    };

    if (options.status) (where as any).status = options.status;

    return paginate<WarehouseInventoryRecord>(
      async (skip, take) => {
        const records = await prisma.warehouseInventory.findMany({
          where,
          skip,
          take,
          orderBy: { receivedAt: "desc" },
        });
        return records as unknown as WarehouseInventoryRecord[];
      },
      () => prisma.warehouseInventory.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: {
      storageLocationId?: string;
      storedAt?: Date;
      dispatchedAt?: Date;
    }
  ): Promise<WarehouseInventoryRecord> {
    const existing = await prisma.warehouseInventory.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Warehouse inventory record not found");
    }

    const record = await prisma.warehouseInventory.update({
      where: { id },
      data: {
        status: status as any,
        storageLocationId: extra?.storageLocationId,
        storedAt: extra?.storedAt,
        dispatchedAt: extra?.dispatchedAt,
      },
    });

    return record as unknown as WarehouseInventoryRecord;
  }

  async getUtilizationByStation(stationId: string) {
    const records = await prisma.warehouseInventory.findMany({
      where: {
        stationId,
        deletedAt: null,
        status: { in: ["RECEIVED" as any, "STORED" as any] },
      },
    });

    const totalWeight = records.reduce((sum, r) => sum + r.weight, 0);
    const totalVolume = records.reduce((sum, r) => sum + r.volume, 0);
    const totalItems = records.length;

    const byStatus = records.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return { totalWeight, totalVolume, totalItems, byStatus };
  }
}

export const warehouseInventoryRepository = new WarehouseInventoryRepository();
