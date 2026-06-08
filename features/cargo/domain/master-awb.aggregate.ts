import { MasterAWBStatus, CustomsStatus, CargoEventType } from "@/types/cargo-domain";
import { MasterAWBAggregateState, CreateMasterAWBCommand, TransitionResult } from "./types";
import { createEvent, eventBus } from "@/lib/events/event-bus";

export class MasterAWBAggregate {
  private state: MasterAWBAggregateState;

  constructor(state: MasterAWBAggregateState) {
    this.state = { ...state };
  }

  static create(command: CreateMasterAWBCommand): MasterAWBAggregate {
    const state: MasterAWBAggregateState = {
      id: crypto.randomUUID(),
      organizationId: command.organizationId,
      originStationId: command.originStationId,
      destinationStationId: command.destinationStationId,
      status: MasterAWBStatus.CREATED,
      masterAWBNumber: command.masterAWBNumber,
      houseAWBIds: [],
      totalWeight: 0,
      totalVolume: 0,
      totalPieces: 0,
      airlineId: command.airlineId,
      flightNumber: command.flightNumber,
      departureTime: command.departureTime,
      arrivalTime: command.arrivalTime,
      customsStatus: CustomsStatus.DECLARED,
      createdAt: new Date(),
    };

    const aggregate = new MasterAWBAggregate(state);

    eventBus.publish(
      createEvent("master_awb.created", "MasterAWB", state.id, {
        masterAWBNumber: state.masterAWBNumber,
        airlineId: state.airlineId,
        flightNumber: state.flightNumber,
        originStationId: state.originStationId,
        destinationStationId: state.destinationStationId,
      }, command.userId)
    );

    return aggregate;
  }

  getState(): Readonly<MasterAWBAggregateState> {
    return { ...this.state };
  }

  getId(): string {
    return this.state.id;
  }

  canAttachHouseAWB(houseWeight: number, houseVolume: number): { allowed: boolean; reason?: string } {
    if (this.state.status !== MasterAWBStatus.CREATED && this.state.status !== MasterAWBStatus.CONSOLIDATING) {
      return { allowed: false, reason: "Cannot attach HAWB: Master AWB is not in consolidation phase" };
    }

    const newWeight = this.state.totalWeight + houseWeight;
    return { allowed: true };
  }

  attachHouseAWB(houseAWBId: string, weight: number, volume: number, pieces: number, userId: string): TransitionResult {
    if (this.state.houseAWBIds.includes(houseAWBId)) {
      return { success: false, errors: ["House AWB already attached to this Master AWB"] };
    }

    this.state.houseAWBIds = [...this.state.houseAWBIds, houseAWBId];
    this.state.totalWeight += weight;
    this.state.totalVolume += volume;
    this.state.totalPieces += pieces;

    if (this.state.status === MasterAWBStatus.CREATED) {
      this.state.status = MasterAWBStatus.CONSOLIDATING;
    }

    eventBus.publish(
      createEvent("master_awb.house_attached", "MasterAWB", this.state.id, {
        houseAWBId,
        totalWeight: this.state.totalWeight,
        totalVolume: this.state.totalVolume,
        totalPieces: this.state.totalPieces,
      }, userId)
    );

    return { success: true, event: CargoEventType.WAREHOUSE_CONSOLIDATED };
  }

  detachHouseAWB(houseAWBId: string, weight: number, volume: number, pieces: number, userId: string): TransitionResult {
    if (this.state.status === MasterAWBStatus.MANIFESTED || this.state.status === MasterAWBStatus.LOADED_TO_AIRLINE) {
      return { success: false, errors: ["Cannot detach HAWB: Manifest is locked"] };
    }

    if (!this.state.houseAWBIds.includes(houseAWBId)) {
      return { success: false, errors: ["House AWB not found in this Master AWB"] };
    }

    this.state.houseAWBIds = this.state.houseAWBIds.filter((id) => id !== houseAWBId);
    this.state.totalWeight -= weight;
    this.state.totalVolume -= volume;
    this.state.totalPieces -= pieces;

    eventBus.publish(
      createEvent("master_awb.house_detached", "MasterAWB", this.state.id, {
        houseAWBId,
        totalWeight: this.state.totalWeight,
        totalVolume: this.state.totalVolume,
        totalPieces: this.state.totalPieces,
      }, userId)
    );

    return { success: true };
  }

  finalizeConsolidation(userId: string): TransitionResult {
    if (this.state.houseAWBIds.length === 0) {
      return { success: false, errors: ["Cannot consolidate: No House AWBs attached"] };
    }

    this.state.status = MasterAWBStatus.CONSOLIDATED;
    this.state.consolidatedAt = new Date();

    eventBus.publish(
      createEvent("master_awb.consolidated", "MasterAWB", this.state.id, {
        houseAWBIds: this.state.houseAWBIds,
        totalWeight: this.state.totalWeight,
        totalPieces: this.state.totalPieces,
      }, userId)
    );

    return { success: true, event: CargoEventType.WAREHOUSE_CONSOLIDATED };
  }

  assignManifest(manifestId: string, manifestNumber: string, userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.CONSOLIDATED) {
      return { success: false, errors: ["Master AWB must be consolidated before manifesting"] };
    }

    this.state.manifestId = manifestId;
    this.state.manifestNumber = manifestNumber;
    this.state.status = MasterAWBStatus.MANIFESTED;
    this.state.manifestedAt = new Date();

    eventBus.publish(
      createEvent("master_awb.manifested", "MasterAWB", this.state.id, {
        manifestId,
        manifestNumber,
      }, userId)
    );

    return { success: true, event: CargoEventType.EXPORT_MANIFESTED };
  }

  markLoaded(uldNumber: string, userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.MANIFESTED) {
      return { success: false, errors: ["Must be manifested before loading"] };
    }

    this.state.status = MasterAWBStatus.LOADED_TO_AIRLINE;

    eventBus.publish(
      createEvent("master_awb.loaded", "MasterAWB", this.state.id, {
        uldNumber,
        flightNumber: this.state.flightNumber,
      }, userId)
    );

    return { success: true, event: CargoEventType.EXPORT_LOADED_TO_AIRLINE };
  }

  markDeparted(actualDepartureTime: Date, userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.LOADED_TO_AIRLINE) {
      return { success: false, errors: ["Must be loaded before departure"] };
    }

    this.state.status = MasterAWBStatus.DEPARTED;
    this.state.departedAt = actualDepartureTime;

    eventBus.publish(
      createEvent("master_awb.departed", "MasterAWB", this.state.id, {
        flightNumber: this.state.flightNumber,
        departureTime: actualDepartureTime,
      }, userId)
    );

    return { success: true, event: CargoEventType.EXPORT_IN_TRANSIT };
  }

  markArrived(actualArrivalTime: Date, userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.DEPARTED && this.state.status !== MasterAWBStatus.IN_TRANSIT) {
      return { success: false, errors: ["Cannot mark arrived: Master AWB has not departed"] };
    }

    this.state.status = MasterAWBStatus.ARRIVED;
    this.state.arrivedAt = actualArrivalTime;

    eventBus.publish(
      createEvent("master_awb.arrived", "MasterAWB", this.state.id, {
        flightNumber: this.state.flightNumber,
        arrivalTime: actualArrivalTime,
      }, userId)
    );

    return { success: true, event: CargoEventType.IMPORT_ARRIVED_AT_HUB };
  }

  close(userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.CLEARED && this.state.status !== MasterAWBStatus.RELEASED) {
      return { success: false, errors: ["Cannot close: Master AWB must be cleared first"] };
    }

    this.state.status = MasterAWBStatus.CLOSED;
    this.state.closedAt = new Date();

    eventBus.publish(
      createEvent("master_awb.closed", "MasterAWB", this.state.id, {}, userId)
    );

    return { success: true };
  }

  updateFlight(airlineId: string, flightNumber: string, departureTime: Date, arrivalTime: Date, userId: string): TransitionResult {
    if (this.state.status !== MasterAWBStatus.CREATED && this.state.status !== MasterAWBStatus.CONSOLIDATING) {
      return { success: false, errors: ["Cannot change flight: Consolidation already finalized"] };
    }

    this.state.airlineId = airlineId;
    this.state.flightNumber = flightNumber;
    this.state.departureTime = departureTime;
    this.state.arrivalTime = arrivalTime;

    eventBus.publish(
      createEvent("master_awb.flight_updated", "MasterAWB", this.state.id, {
        airlineId,
        flightNumber,
        departureTime,
        arrivalTime,
      }, userId)
    );

    return { success: true };
  }

  static validateCapacity(airlineCapacity: number, currentLoad: number, additionalWeight: number): boolean {
    return currentLoad + additionalWeight <= airlineCapacity;
  }

  static hydrate(state: MasterAWBAggregateState): MasterAWBAggregate {
    return new MasterAWBAggregate(state);
  }
}
