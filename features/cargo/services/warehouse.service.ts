import { prisma } from "@/lib/prisma";
import { Prisma, $Enums } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/errors";
import { trackingService } from "@/features/cargo/services/tracking.service";
import { WarehouseStatus } from "@/types/cargo-domain";
import { WarehouseStatusWorkflow } from "@/features/cargo/workflows/warehouse.workflow";

export type CargoStatus = $Enums.CargoStatus;

const warehouseWorkflow = new WarehouseStatusWorkflow();

export interface ReceiveCargoParams {
  stationId: string;
  houseAWBId?: string;
  masterAWBId?: string;
  quantity?: number;
  weight?: number;
  volume?: number;
  userId: string;
}

export interface CargoOperationParams {
  inventoryId: string;
  userId: string;
}

export interface RackCargoParams {
  inventoryId: string;
  locationId: string;
  userId: string;
}

export interface AssignLocationParams {
  parcelId: string;
  locationId: string;
  userId: string;
}

export interface MovementRecord {
  inventoryId: string;
  fromLocationId?: string;
  toLocationId: string;
  userId: string;
  reason?: string;
}

export class WarehouseService {
  async receiveCargo(params: ReceiveCargoParams) {
    const inventory = await prisma.warehouseInventory.create({
      data: {
        stationId: params.stationId,
        houseAWBId: params.houseAWBId ?? null,
        masterAWBId: params.masterAWBId ?? null,
        status: "RECEIVED",
        quantity: params.quantity ?? 1,
        weight: params.weight ?? 0,
        volume: params.volume ?? 0,
        receivedAt: new Date(),
      },
    });

    const aggregateId = params.houseAWBId ?? params.masterAWBId!;
    const entityType = params.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = this.mapWarehouseToCargoStatus("RECEIVED");

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "WAREHOUSE_RECEIVED",
      status,
      title: "Cargo Received at Warehouse",
      description: `Cargo received at warehouse station ${params.stationId}`,
      userId: params.userId,
      stationId: params.stationId,
      scanSource: "WAREHOUSE",
      metadata: { inventoryId: inventory.id, operation: "receive" },
    });

    return inventory;
  }

  async rackCargo(inventoryId: string, locationId: string, userId: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    if (
      !warehouseWorkflow.canTransition(
        inventory.status as any,
        "RACKED" as WarehouseStatus
      )
    ) {
      throw new AppError(
        `Cannot rack cargo from status ${inventory.status}`,
        422,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const location = await prisma.warehouseLocation.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundError("Warehouse location");
    }

    if (location.assignedAt && !location.releasedAt) {
      throw new AppError(
        "Warehouse location is already occupied",
        409,
        "LOCATION_OCCUPIED"
      );
    }

    const updated = await prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        status: "RACKED",
        storageLocationId: locationId,
        storedAt: new Date(),
      },
    });

    await prisma.warehouseLocation.update({
      where: { id: locationId },
      data: {
        assignedAt: new Date(),
        movedAt: new Date(),
      },
    });

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = "RCS";

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "WAREHOUSE_STORED",
      status,
      title: "Cargo Racked",
      description: `Cargo moved to rack location ${location.rack}/${location.shelf}/${location.bin}`,
      userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: {
        inventoryId,
        locationId,
        location: `${location.warehouse}/${location.zone}/${location.rack}/${location.shelf}/${location.bay}/${location.bin}`,
      },
    });

    return updated;
  }

  async pickCargo(inventoryId: string, userId: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    if (
      !warehouseWorkflow.canTransition(
        inventory.status as any,
        "READY_FOR_DISPATCH" as WarehouseStatus
      )
    ) {
      throw new AppError(
        `Cannot pick cargo from status ${inventory.status}`,
        422,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const updated = await prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: { status: "PICKED" },
    });

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = this.mapWarehouseToCargoStatus("PICKED");

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "WAREHOUSE_READY_FOR_DISPATCH",
      status,
      title: "Cargo Picked",
      description: "Cargo picked from warehouse rack for dispatch",
      userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: { inventoryId, operation: "pick" },
    });

    return updated;
  }

  async loadCargo(inventoryId: string, userId: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    if (
      !warehouseWorkflow.canTransition(
        inventory.status as any,
        "READY_FOR_DISPATCH" as WarehouseStatus
      )
    ) {
      throw new AppError(
        `Cannot load cargo from status ${inventory.status}`,
        422,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const updated = await prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: { status: "LOADED" },
    });

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = "LOADED";

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "WAREHOUSE_DISPATCHED",
      status,
      title: "Cargo Loaded",
      description: "Cargo loaded onto transport for dispatch",
      userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: { inventoryId, operation: "load" },
    });

    return updated;
  }

  async offloadCargo(inventoryId: string, userId: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    const updated = await prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: { status: "OFFLOADED" },
    });

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = "OFFLOADED";

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "IMPORT_ARRIVED_AT_HUB",
      status,
      title: "Cargo Offloaded",
      description: "Cargo offloaded at destination station",
      userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: { inventoryId, operation: "offload" },
    });

    return updated;
  }

  async releaseCargo(inventoryId: string, userId: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    const updated = await prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        status: "RELEASED",
        dispatchedAt: new Date(),
      },
    });

    if (inventory.storageLocationId) {
      await prisma.warehouseLocation.update({
        where: { id: inventory.storageLocationId },
        data: { releasedAt: new Date() },
      });
    }

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = "RELEASED";

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "CUSTOMS_RELEASED",
      status,
      title: "Cargo Released",
      description: "Cargo released from warehouse",
      userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: { inventoryId, operation: "release" },
    });

    return updated;
  }

  async getLocations(warehouse: string, zone?: string) {
    const where: Prisma.WarehouseLocationWhereInput = { warehouse };

    if (zone) {
      where.zone = zone;
    }

    const locations = await prisma.warehouseLocation.findMany({
      where: {
        ...where,
        deletedAt: null,
      },
      include: {
        parcels: {
          select: {
            id: true,
            parcelTrackingNumber: true,
            barcode: true,
            description: true,
          },
        },
      },
      orderBy: [{ zone: "asc" }, { rack: "asc" }, { shelf: "asc" }],
    });

    return locations.map((l) => ({
      ...l,
      isOccupied: l.assignedAt !== null && l.releasedAt === null,
      currentParcel: l.parcels.length > 0 ? l.parcels[0] : null,
      parcels: undefined,
    }));
  }

  async assignLocation(parcelId: string, locationId: string, userId: string) {
    const location = await prisma.warehouseLocation.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundError("Warehouse location");
    }

    if (location.assignedAt && !location.releasedAt) {
      throw new AppError(
        "Location is already occupied",
        409,
        "LOCATION_OCCUPIED"
      );
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { houseAWB: true },
    });
    if (!parcel) {
      throw new NotFoundError("Parcel");
    }

    const updated = await prisma.parcel.update({
      where: { id: parcelId },
      data: { warehouseLocationId: locationId },
    });

    await prisma.warehouseLocation.update({
      where: { id: locationId },
      data: {
        assignedAt: new Date(),
        movedAt: new Date(),
      },
    });

    const status: CargoStatus = "RCS";

    await trackingService.createTrackingEvent({
      entityType: "Parcel",
      entityId: parcelId,
      eventType: "WAREHOUSE_STORED",
      status,
      title: "Parcel Assigned to Location",
      description: `Parcel assigned to ${location.warehouse}/${location.zone}/${location.rack}/${location.shelf}`,
      userId,
      scanSource: "WAREHOUSE",
      metadata: {
        parcelId,
        locationId,
        location: `${location.warehouse}/${location.zone}/${location.rack}/${location.shelf}/${location.bay}/${location.bin}`,
      },
    });

    return updated;
  }

  async recordMovement(params: MovementRecord) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: params.inventoryId },
    });
    if (!inventory) {
      throw new NotFoundError("Warehouse inventory record");
    }

    const toLocation = await prisma.warehouseLocation.findUnique({
      where: { id: params.toLocationId },
    });
    if (!toLocation) {
      throw new NotFoundError("Destination warehouse location");
    }

    if (params.fromLocationId) {
      await prisma.warehouseLocation.update({
        where: { id: params.fromLocationId },
        data: { releasedAt: new Date() },
      });
    }

    await prisma.warehouseLocation.update({
      where: { id: params.toLocationId },
      data: {
        assignedAt: new Date(),
        movedAt: new Date(),
      },
    });

    const updated = await prisma.warehouseInventory.update({
      where: { id: params.inventoryId },
      data: {
        storageLocationId: params.toLocationId,
        storedAt: new Date(),
      },
    });

    const aggregateId = inventory.houseAWBId ?? inventory.masterAWBId!;
    const entityType = inventory.houseAWBId ? "HouseAWB" : "MasterAWB";
    const status: CargoStatus = "RCS";

    await trackingService.createTrackingEvent({
      entityType,
      entityId: aggregateId,
      eventType: "WAREHOUSE_STORED",
      status,
      title: "Warehouse Location Movement",
      description: `Cargo moved from ${params.fromLocationId ?? "receiving"} to location ${params.toLocationId}${params.reason ? ` (${params.reason})` : ""}`,
      userId: params.userId,
      stationId: inventory.stationId,
      scanSource: "WAREHOUSE",
      metadata: {
        inventoryId: params.inventoryId,
        fromLocationId: params.fromLocationId ?? null,
        toLocationId: params.toLocationId,
        reason: params.reason ?? null,
      },
    });

    return updated;
  }

  private mapWarehouseToCargoStatus(
    warehouseStatus: string
  ): CargoStatus {
    const map: Record<string, CargoStatus> = {
      RECEIVED: "RCS",
      RACKED: "RCS",
      PICKED: "LOADED",
      LOADED: "LOADED",
      OFFLOADED: "OFFLOADED",
      RELEASED: "RELEASED",
    };
    return map[warehouseStatus] ?? "RCS";
  }
}

export const warehouseService = new WarehouseService();
