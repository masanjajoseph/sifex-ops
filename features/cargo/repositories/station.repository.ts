import { prisma } from "@/lib/prisma";

export interface StationRecord {
  id: string;
  name: string;
  code: string;
  type: string;
  organizationId: string;
  address: string | null;
  city: string | null;
  country: string | null;
  branchId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class StationRepository {
  async create(data: {
    name: string;
    code: string;
    type: string;
    organizationId: string;
    branchId: string;
    address?: string;
    city?: string;
    country?: string;
  }): Promise<StationRecord> {
    const record = await prisma.station.create({
      data: data as any,
    });

    return record as unknown as StationRecord;
  }

  async findById(id: string): Promise<StationRecord | null> {
    const record = await prisma.station.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as StationRecord | null;
  }

  async findByCode(code: string): Promise<StationRecord | null> {
    const record = await prisma.station.findFirst({
      where: { code: code as any, deletedAt: null },
    });

    return record as unknown as StationRecord | null;
  }

  async findByBranch(branchId: string): Promise<StationRecord[]> {
    const records = await prisma.station.findMany({
      where: { branchId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });

    return records as unknown as StationRecord[];
  }

  async findByOrganization(organizationId: string): Promise<StationRecord[]> {
    const records = await prisma.station.findMany({
      where: { organizationId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });

    return records as unknown as StationRecord[];
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      type: string;
      address: string;
      city: string;
      country: string;
      isActive: boolean;
    }>
  ): Promise<StationRecord> {
    const record = await prisma.station.update({
      where: { id },
      data: data as any,
    });

    return record as unknown as StationRecord;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.station.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const stationRepository = new StationRepository();
