import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";

export interface ManifestRecord {
  id: string;
  flightId: string;
  manifestNumber: string;
  manifestType: "EXPORT" | "IMPORT";
  status: string;
  totalWeight: number;
  totalVolume: number;
  totalPieces: number;
  masterAWBIds: string[];
  submittedAt?: Date;
  submittedBy?: string;
  airlineConfirmedAt?: Date;
  airlineConfirmedBy?: string;
  departedAt?: Date;
  arrivedAt?: Date;
  customsSubmittedAt?: Date;
  customsApprovedAt?: Date;
  createdAt: Date;
  closedAt?: Date;
  deletedAt?: Date;
}

export class ManifestRepository {
  async save(data: Omit<ManifestRecord, "createdAt" | "deletedAt">): Promise<ManifestRecord> {
    const record = await prisma.manifest.upsert({
      where: { id: data.id },
      create: {
        ...data,
        masterAWBIds: data.masterAWBIds,
      },
      update: {
        ...data,
        masterAWBIds: data.masterAWBIds,
      },
    });

    return record as unknown as ManifestRecord;
  }

  async findById(id: string): Promise<ManifestRecord | null> {
    const record = await prisma.manifest.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as ManifestRecord | null;
  }

  async findByManifestNumber(manifestNumber: string): Promise<ManifestRecord | null> {
    const record = await prisma.manifest.findFirst({
      where: { manifestNumber, deletedAt: null },
    });

    return record as unknown as ManifestRecord | null;
  }

  async findByFlight(flightId: string): Promise<ManifestRecord[]> {
    const records = await prisma.manifest.findMany({
      where: { flightId, deletedAt: null },
    });

    return records as unknown as ManifestRecord[];
  }

  async findByOrganization(
    options: { page?: number; pageSize?: number; status?: string }
  ) {
    const where: Prisma.ManifestWhereInput = {
      deletedAt: null,
    };

    if (options.status) where.status = options.status;

    return paginate<ManifestRecord>(
      async (skip, take) => {
        const records = await prisma.manifest.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        });
        return records as unknown as ManifestRecord[];
      },
      () => prisma.manifest.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    await prisma.manifest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const manifestRepository = new ManifestRepository();
