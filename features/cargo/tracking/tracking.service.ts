import { HouseAWBStatus, CargoEventType } from "@/types/cargo-domain";
import { houseAWBRepository } from "../repositories/house-awb.repository";
import { masterAWBRepository } from "../repositories/master-awb.repository";
import { shipmentTimelineService, TimelineEvent } from "../timeline/shipment-timeline.service";

export interface TrackingResult {
  reference: string;
  status: HouseAWBStatus;
  origin: string;
  destination: string;
  pieces: number;
  weight: number;
  timeline: TimelineEvent[];
  estimatedDelivery?: Date;
  lastUpdate: Date;
}

export class TrackingService {
  async trackByReference(reference: string): Promise<TrackingResult | null> {
    // Try House AWB tracking number
    const houseAWB = await houseAWBRepository.findByTrackingNumber(reference);
    if (houseAWB) {
      const state = houseAWB.getState();
      const timeline = await shipmentTimelineService.getCustomerVisibleTimeline(state.id, "HouseAWB");

      return {
        reference: state.trackingNumber,
        status: state.status,
        origin: state.originCountry,
        destination: state.destinationCountry,
        pieces: state.totalPieces,
        weight: state.totalWeight,
        timeline,
        lastUpdate: timeline[0]?.timestamp ?? state.createdAt,
      };
    }

    // Try Master AWB number
    const masterAWB = await masterAWBRepository.findByMasterAWBNumber(reference);
    if (masterAWB) {
      const state = masterAWB.getState();
      const timeline = await shipmentTimelineService.getCustomerVisibleTimeline(state.id, "MasterAWB");

      return {
        reference: state.masterAWBNumber,
        status: HouseAWBStatus.EXPORT_IN_TRANSIT,
        origin: state.originStationId,
        destination: state.destinationStationId,
        pieces: state.totalPieces,
        weight: state.totalWeight,
        timeline,
        estimatedDelivery: state.arrivalTime,
        lastUpdate: timeline[0]?.timestamp ?? state.createdAt,
      };
    }

    return null;
  }

  async trackByHouseAWBId(houseAWBId: string): Promise<TrackingResult | null> {
    const houseAWB = await houseAWBRepository.findById(houseAWBId);
    if (!houseAWB) return null;

    return this.trackByReference(houseAWB.getState().trackingNumber);
  }

  async getBulkTracking(references: string[]): Promise<(TrackingResult | null)[]> {
    return Promise.all(references.map((ref) => this.trackByReference(ref)));
  }

  async subscribeToTracking(
    reference: string,
    callback: (event: TimelineEvent) => void
  ): Promise<() => void> {
    const { eventBus } = await import("@/lib/events/event-bus");

    const handler = (event: any) => {
      if (event.payload?.aggregateId === reference) {
        callback(event as unknown as TimelineEvent);
      }
    };

    eventBus.subscribe("timeline.event_created", handler);

    return () => {
      eventBus.unsubscribe("timeline.event_created", handler);
    };
  }
}

export const trackingService = new TrackingService();
