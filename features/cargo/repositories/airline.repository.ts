import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface AirlineRecord {
  id: string;
  name: string;
  iataCode: string;
  icaoCode: string;
  status: string;
  standardRate: number;
  premiumRate: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class AirlineRepository {
  async save(data: Omit<AirlineRecord, "createdAt" | "updatedAt" | "deletedAt">): Promise<AirlineRecord> {
    const record = await prisma.airline.upsert({
      where: { id: data.id },
      create: data as any,
      update: {
        name: data.name,
        iataCode: data.iataCode,
        icaoCode: data.icaoCode,
        status: data.status,
        standardRate: data.standardRate,
        premiumRate: data.premiumRate,
      },
    });

    return record as unknown as AirlineRecord;
  }

  async findById(id: string): Promise<AirlineRecord | null> {
    const record = await prisma.airline.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as AirlineRecord | null;
  }

  async findByIataCode(iataCode: string): Promise<AirlineRecord | null> {
    const record = await prisma.airline.findUnique({
      where: { iataCode, deletedAt: null },
    });

    return record as unknown as AirlineRecord | null;
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
    } = {}
  ) {
    const where: Prisma.AirlineWhereInput = {
      deletedAt: null,
    };

    if (options.status) where.status = options.status;

    return paginate<AirlineRecord>(
      async (skip, take) => {
        const records = await prisma.airline.findMany({
          where,
          skip,
          take,
          orderBy: { name: "asc" },
        });
        return records as unknown as AirlineRecord[];
      },
      () => prisma.airline.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.airline.findUnique({ where: { id } });
    if (!existing) throw new AppError("Airline not found", 404, "NOT_FOUND");

    await prisma.airline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const airlineRepository = new AirlineRepository();
