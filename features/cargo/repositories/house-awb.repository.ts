// Phase 2.1: House AWB Repository
// Handles persistence of House AWB aggregates

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { HouseAWBAggregate } from "../domain/house-awb.aggregate";
import { HouseAWBAggregateState, ParcelState } from "../domain/types";
import { paginate } from "@/lib/db-helpers";

export class HouseAWBRepository {
  async save(aggregate: HouseAWBAggregate): Promise<void> {
    const state = aggregate.getState();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Upsert House AWB
      await tx.houseAWB.upsert({
        where: { id: state.id },
        create: {
          id: state.id,
          organizationId: state.organizationId,
          masterAWBId: state.masterAWBId,
          cargoStatus: state.status as any,
          houseAWBNumber: state.houseAWBNumber,
          shipperId: state.id,
          receiverId: state.id,
          trackingNumber: state.trackingNumber,
          hsCode: state.hsCode || "",
          originCountry: state.originCountry || "",
          destinationCountry: state.destinationCountry || "",
          totalWeight: state.totalWeight,
          totalVolume: state.totalVolume,
          totalPieces: state.totalPieces,
          houseAWBBillingId: state.houseAWBBillingId,
          customsDeclarationId: state.customsDeclarationId,
          pickedUpAt: state.pickedUpAt,
          consolidatedAt: state.consolidatedAt,
          deliveredAt: state.deliveredAt,
          signedAt: state.signedAt,
        },
        update: {
          masterAWBId: state.masterAWBId,
          cargoStatus: state.status as any,
          totalWeight: state.totalWeight,
          totalVolume: state.totalVolume,
          totalPieces: state.totalPieces,
          houseAWBBillingId: state.houseAWBBillingId,
          customsDeclarationId: state.customsDeclarationId,
          pickedUpAt: state.pickedUpAt,
          consolidatedAt: state.consolidatedAt,
          deliveredAt: state.deliveredAt,
          signedAt: state.signedAt,
        },
      } as any);

      // Sync parcels: delete removed, upsert existing/new
      const existingParcels = await tx.parcel.findMany({
        where: { houseAWBId: state.id },
      });
      const existingIds = existingParcels.map((p) => p.id);
      const currentIds = state.parcels.map((p) => p.id);

      // Delete parcels no longer in the aggregate
      const toDelete = existingIds.filter((id: string) => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await tx.parcel.deleteMany({ where: { id: { in: toDelete } } });
      }

      // Upsert current parcels
      for (const parcel of state.parcels) {
        await tx.parcel.upsert({
          where: { id: parcel.id },
          create: {
            id: parcel.id,
            houseAWBId: state.id,
            parcelTrackingNumber: parcel.barcode || parcel.id,
            barcode: parcel.barcode || parcel.id,
            description: parcel.description,
            quantity: parcel.quantity,
            actualWeight: parcel.weight,
            volume: parcel.volume,
            volumetricWeight: parcel.volumetricWeight,
            value: parcel.value,
            hsCode: parcel.hsCode,
            packageType: parcel.packageType,
            condition: parcel.condition,
          } as any,
          update: {
            description: parcel.description,
            quantity: parcel.quantity,
            actualWeight: parcel.weight,
            volume: parcel.volume,
            volumetricWeight: parcel.volumetricWeight,
            value: parcel.value,
            hsCode: parcel.hsCode,
            condition: parcel.condition,
          } as any,
        });
      }
    });
  }

  async findById(id: string): Promise<HouseAWBAggregate | null> {
    const record = await prisma.houseAWB.findUnique({
      where: { id, deletedAt: null },
      include: { parcels: true },
    });

    if (!record) return null;

    return HouseAWBAggregate.hydrate(this.toState(record));
  }

  async findByTrackingNumber(trackingNumber: string): Promise<HouseAWBAggregate | null> {
    const record = await prisma.houseAWB.findFirst({
      where: { trackingNumber, deletedAt: null },
      include: { parcels: true },
    });

    if (!record) return null;

    return HouseAWBAggregate.hydrate(this.toState(record));
  }

  async findByMasterAWB(masterAWBId: string): Promise<HouseAWBAggregate[]> {
    const records = await prisma.houseAWB.findMany({
      where: { masterAWBId, deletedAt: null },
      include: { parcels: true },
    });

    return records.map((r) => HouseAWBAggregate.hydrate(this.toState(r)));
  }

  async findByOrganization(
    organizationId: string,
    options: { page?: number; pageSize?: number; status?: string; masterAWBId?: string }
  ) {
    const where = {
      organizationId,
      deletedAt: null,
      ...(options.status && { status: options.status }),
      ...(options.masterAWBId && { masterAWBId: options.masterAWBId }),
    };

    return paginate<HouseAWBAggregateState>(
      async (skip, take) => {
        const records = await prisma.houseAWB.findMany({
          where,
          skip,
          take,
          include: { parcels: true },
          orderBy: { createdAt: "desc" },
        });
        return records.map((r) => this.toState(r));
      },
      () => prisma.houseAWB.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    await prisma.houseAWB.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toState(record: any): HouseAWBAggregateState {
    return {
      id: record.id,
      organizationId: record.organizationId,
      masterAWBId: record.masterAWBId,
      status: record.status,
      houseAWBNumber: record.houseAWBNumber,
      shipperId: record.shipperId,
      recipientId: record.recipientId,
      parcels: record.parcels?.map((p: any) => this.toParcelState(p)) ?? [],
      totalWeight: record.totalWeight,
      totalVolume: record.totalVolume,
      totalPieces: record.totalPieces,
      hsCode: record.hsCode,
      customsValue: record.customsValue,
      customsCurrency: record.customsCurrency,
      originCountry: record.originCountry,
      destinationCountry: record.destinationCountry,
      trackingNumber: record.trackingNumber,
      houseAWBBillingId: record.houseAWBBillingId,
      customsDeclarationId: record.customsDeclarationId,
      createdAt: record.createdAt,
      pickedUpAt: record.pickedUpAt,
      consolidatedAt: record.consolidatedAt,
      deliveredAt: record.deliveredAt,
      signedAt: record.signedAt,
      deletedAt: record.deletedAt,
    };
  }

  private toParcelState(record: any): ParcelState {
    return {
      id: record.id,
      houseAWBId: record.houseAWBId,
      description: record.description,
      quantity: record.quantity,
      weight: record.weight,
      volume: record.volume,
      volumetricWeight: record.volumetricWeight,
      value: record.value,
      hsCode: record.hsCode,
      barcode: record.barcode,
      packageType: record.packageType,
      condition: record.condition,
      createdAt: record.createdAt,
    };
  }
}

export const houseAWBRepository = new HouseAWBRepository();
