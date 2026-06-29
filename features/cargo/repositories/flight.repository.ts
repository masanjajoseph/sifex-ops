import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface FlightRecord {
  id: string;
  airlineId: string;
  flightNumber: string;
  aircraftType: string | null;
  originStationId: string;
  destinationStationId: string;
  departureTime: Date;
  arrivalTime: Date;
  totalCapacity: number;
  availableCapacity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class FlightRepository {
  async save(data: Omit<FlightRecord, "createdAt" | "updatedAt" | "deletedAt">): Promise<FlightRecord> {
    const record = await prisma.flight.upsert({
      where: { id: data.id },
      create: data as any,
      update: {
        airlineId: data.airlineId,
        flightNumber: data.flightNumber,
        aircraftType: data.aircraftType,
        originStationId: data.originStationId,
        destinationStationId: data.destinationStationId,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        totalCapacity: data.totalCapacity,
        availableCapacity: data.availableCapacity,
        status: data.status,
      },
    });

    return record as unknown as FlightRecord;
  }

  async findById(id: string): Promise<FlightRecord | null> {
    const record = await prisma.flight.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as FlightRecord | null;
  }

  async findByFlightNumber(flightNumber: string): Promise<FlightRecord | null> {
    const record = await prisma.flight.findFirst({
      where: { flightNumber, deletedAt: null },
    });

    return record as unknown as FlightRecord | null;
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      airlineId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: Prisma.FlightWhereInput = {
      deletedAt: null,
    };

    if (options.status) where.status = options.status;
    if (options.airlineId) where.airlineId = options.airlineId;
    if (options.dateFrom || options.dateTo) {
      where.departureTime = {};
      if (options.dateFrom) where.departureTime.gte = options.dateFrom;
      if (options.dateTo) where.departureTime.lte = options.dateTo;
    }

    return paginate<FlightRecord>(
      async (skip, take) => {
        const records = await prisma.flight.findMany({
          where,
          skip,
          take,
          orderBy: { departureTime: "asc" },
        });
        return records as unknown as FlightRecord[];
      },
      () => prisma.flight.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.flight.findUnique({ where: { id } });
    if (!existing) throw new AppError("Flight not found", 404, "NOT_FOUND");

    await prisma.flight.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const flightRepository = new FlightRepository();
