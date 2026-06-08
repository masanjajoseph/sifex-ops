import { HouseAWBStatus, CargoEventType } from "@/types/cargo-domain";
import {
  HouseAWBAggregateState,
  ParcelState,
  CreateHouseAWBCommand,
  CreateParcelCommand,
  TransitionResult,
} from "./types";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { Parcel } from "./parcel.entity";

export class HouseAWBAggregate {
  private state: HouseAWBAggregateState;

  private constructor(state: HouseAWBAggregateState) {
    this.state = { ...state };
  }

  static create(command: CreateHouseAWBCommand): HouseAWBAggregate {
    const parcels = command.parcels.map((p) =>
      Parcel.create({ ...p, houseAWBId: "" })
    );

    const totalWeight = parcels.reduce((sum, p) => sum + p.getWeight(), 0);
    const totalVolume = parcels.reduce((sum, p) => sum + p.getVolume(), 0);
    const totalPieces = parcels.reduce((sum, p) => sum + p.getQuantity(), 0);
    const trackingNumber = HouseAWBAggregate.generateTrackingNumber();

    const state: HouseAWBAggregateState = {
      id: crypto.randomUUID(),
      organizationId: command.organizationId,
      status: HouseAWBStatus.EXPORT_CREATED,
      houseAWBNumber: trackingNumber,
      shipperId: command.shipperId,
      recipientId: command.recipientId,
      parcels: parcels.map((p) => ({ ...p.getState(), houseAWBId: "" })),
      totalWeight,
      totalVolume,
      totalPieces,
      hsCode: command.hsCode,
      customsValue: command.customsValue,
      customsCurrency: command.customsCurrency,
      originCountry: command.originCountry,
      destinationCountry: command.destinationCountry,
      trackingNumber,
      createdAt: new Date(),
    };

    const aggregate = new HouseAWBAggregate(state);

    // Update parcel houseAWBId after aggregate creation
    aggregate.state.parcels = aggregate.state.parcels.map((p) => ({
      ...p,
      houseAWBId: aggregate.state.id,
    }));

    eventBus.publish(
      createEvent("house_awb.created", "HouseAWB", aggregate.state.id, {
        houseAWBNumber: aggregate.state.houseAWBNumber,
        shipperId: aggregate.state.shipperId,
        recipientId: aggregate.state.recipientId,
        totalPieces: aggregate.state.totalPieces,
        totalWeight: aggregate.state.totalWeight,
        originCountry: aggregate.state.originCountry,
        destinationCountry: aggregate.state.destinationCountry,
      }, command.userId)
    );

    return aggregate;
  }

  getState(): Readonly<HouseAWBAggregateState> {
    return { ...this.state };
  }

  getId(): string {
    return this.state.id;
  }

  getStatus(): HouseAWBStatus {
    return this.state.status;
  }

  attachToMaster(masterAWBId: string, userId: string): TransitionResult {
    if (this.state.masterAWBId) {
      return { success: false, errors: ["House AWB already attached to a Master AWB"] };
    }

    if (this.state.status !== HouseAWBStatus.EXPORT_CREATED &&
        this.state.status !== HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE) {
      return { success: false, errors: ["Cannot attach: Invalid status for consolidation"] };
    }

    this.state.masterAWBId = masterAWBId;

    eventBus.publish(
      createEvent("house_awb.attached_to_master", "HouseAWB", this.state.id, {
        masterAWBId,
      }, userId)
    );

    return { success: true };
  }

  detachFromMaster(userId: string): TransitionResult {
    if (!this.state.masterAWBId) {
      return { success: false, errors: ["House AWB is not attached to any Master AWB"] };
    }

    this.state.masterAWBId = undefined;

    eventBus.publish(
      createEvent("house_awb.detached_from_master", "HouseAWB", this.state.id, {}, userId)
    );

    return { success: true };
  }

  addParcel(parcelData: CreateParcelCommand, userId: string): TransitionResult {
    if (this.state.status !== HouseAWBStatus.EXPORT_CREATED &&
        this.state.status !== HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE) {
      return { success: false, errors: ["Cannot add parcel: Shipment already in progress"] };
    }

    const parcel = Parcel.create({
      ...parcelData,
      houseAWBId: this.state.id,
    });

    const parcelState = { ...parcel.getState(), houseAWBId: this.state.id };
    this.state.parcels = [...this.state.parcels, parcelState];
    this.state.totalWeight += parcelState.weight;
    this.state.totalVolume += parcelState.volume;
    this.state.totalPieces += parcelState.quantity;

    eventBus.publish(
      createEvent("house_awb.parcel_added", "HouseAWB", this.state.id, {
        parcelId: parcelState.id,
        weight: parcelState.weight,
        volume: parcelState.volume,
      }, userId)
    );

    return { success: true };
  }

  removeParcel(parcelId: string, userId: string): TransitionResult {
    if (this.state.status !== HouseAWBStatus.EXPORT_CREATED) {
      return { success: false, errors: ["Cannot remove parcel: Shipment already in progress"] };
    }

    const parcelIndex = this.state.parcels.findIndex((p) => p.id === parcelId);
    if (parcelIndex === -1) {
      return { success: false, errors: ["Parcel not found"] };
    }

    const removed = this.state.parcels[parcelIndex];
    this.state.parcels = this.state.parcels.filter((p) => p.id !== parcelId);
    this.state.totalWeight -= removed.weight;
    this.state.totalVolume -= removed.volume;
    this.state.totalPieces -= removed.quantity;

    eventBus.publish(
      createEvent("house_awb.parcel_removed", "HouseAWB", this.state.id, {
        parcelId,
        weight: removed.weight,
      }, userId)
    );

    return { success: true };
  }

  applyTransition(
    newStatus: HouseAWBStatus,
    userId: string,
    metadata?: Record<string, unknown>
  ): TransitionResult {
    const { isValidExportTransition, getExportTransitionDetails } =
      require("../engines/export.engine");
    const { isValidImportTransition, getImportTransitionDetails } =
      require("../engines/import.engine");

    let event: CargoEventType | undefined;
    let isValid = false;

    const exportDetail = getExportTransitionDetails(this.state.status, newStatus);
    if (exportDetail) {
      isValid = true;
      event = exportDetail.event;
    }

    const importDetail = getImportTransitionDetails(this.state.status, newStatus);
    if (importDetail) {
      isValid = true;
      event = importDetail.event;
    }

    if (!isValid) {
      return {
        success: false,
        errors: [`Transition from ${this.state.status} to ${newStatus} is not allowed`],
      };
    }

    this.state.status = newStatus;

    if (newStatus === HouseAWBStatus.EXPORT_PICKED_UP) this.state.pickedUpAt = new Date();
    if (newStatus === HouseAWBStatus.EXPORT_CONSOLIDATED) this.state.consolidatedAt = new Date();
    if (newStatus === HouseAWBStatus.IMPORT_DELIVERED) this.state.deliveredAt = new Date();
    if (newStatus === HouseAWBStatus.IMPORT_SIGNED) this.state.signedAt = new Date();

    eventBus.publish(
      createEvent("house_awb.status_changed", "HouseAWB", this.state.id, {
        fromStatus: this.state.status,
        toStatus: newStatus,
        eventType: event,
        metadata,
      }, userId)
    );

    return { success: true, event };
  }

  private static generateTrackingNumber(): string {
    const prefix = "HAWB";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  static hydrate(state: HouseAWBAggregateState): HouseAWBAggregate {
    return new HouseAWBAggregate(state);
  }
}
