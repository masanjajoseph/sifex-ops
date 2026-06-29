import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MasterAWBAggregate } from "../domain/master-awb.aggregate";
import { MasterAWBAggregateState } from "../domain/types";
import { paginate } from "@/lib/db-helpers";

export class MasterAWBRepository {
  async save(aggregate: MasterAWBAggregate): Promise<void> {
    const state = aggregate.getState();

    await prisma.masterAWB.upsert({
      where: { id: state.id },
      create: {
        id: state.id,
        originStationId: state.originStationId,
        destinationStationId: state.destinationStationId,
        cargoStatus: state.status as any,
        masterAWBNumber: state.masterAWBNumber,
        airlineId: state.airlineId,
        flightNumber: state.flightNumber,
        departureTime: state.departureTime,
        arrivalTime: state.arrivalTime,
        customsDeclarationId: state.customsDeclarationId,
        customsStatus: state.customsStatus as any,
        masterAWBBillingId: state.masterAWBBillingId,
        createdAt: state.createdAt,
        updatedAt: new Date(),
      } as any,
      update: state as any,
    });
  }

  async findById(id: string): Promise<MasterAWBAggregate | null> {
    const record = await prisma.masterAWB.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return MasterAWBAggregate.hydrate(this.toState(record));
  }

  async findByMasterAWBNumber(masterAWBNumber: string): Promise<MasterAWBAggregate | null> {
    const record = await prisma.masterAWB.findFirst({
      where: { awbNumber: masterAWBNumber, deletedAt: null },
    });

    if (!record) return null;

    return MasterAWBAggregate.hydrate(this.toState(record));
  }

  async findByOrganization(
    options: { page?: number; pageSize?: number; status?: string }
  ) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (options.status) {
      where.cargoStatus = options.status;
    }

    return paginate<MasterAWBAggregateState>(
      async (skip, take) => {
        const records = await prisma.masterAWB.findMany({
          where: where as any,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        });
        return records.map((r) => this.toState(r));
      },
      () => prisma.masterAWB.count({ where: where as any }),
      options.page,
      options.pageSize
    );
  }

  async findByFlight(flightNumber: string): Promise<MasterAWBAggregate[]> {
    const records = await prisma.masterAWB.findMany({
      where: { flightNumber, deletedAt: null },
    });

    return records.map((r) => MasterAWBAggregate.hydrate(this.toState(r)));
  }

  async softDelete(id: string): Promise<void> {
    await prisma.masterAWB.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toState(record: any): MasterAWBAggregateState {
    return {
      id: record.id,
      originStationId: record.originStationId,
      destinationStationId: record.destinationStationId,
      status: record.cargoStatus,
      masterAWBNumber: record.masterAWBNumber,
      houseAWBIds: [],
      totalWeight: record.totalWeight,
      totalVolume: record.totalVolume,
      totalPieces: record.totalPieces,
      airlineId: record.airlineId,
      flightNumber: record.flightNumber,
      departureTime: record.departureTime,
      arrivalTime: record.arrivalTime,
      manifestId: record.manifestId,
      manifestNumber: record.manifestNumber,
      customsDeclarationId: record.customsDeclarationId,
      customsStatus: record.customsStatus,
      masterAWBBillingId: record.masterAWBBillingId,
      createdAt: record.createdAt,
      consolidatedAt: record.consolidatedAt,
      manifestedAt: record.manifestedAt,
      departedAt: record.departedAt,
      arrivedAt: record.arrivedAt,
      closedAt: record.closedAt,
      deletedAt: record.deletedAt,
    };
  }
}

export const masterAWBRepository = new MasterAWBRepository();
