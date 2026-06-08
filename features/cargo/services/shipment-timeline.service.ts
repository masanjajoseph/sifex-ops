import { CargoEventType } from "@/types/cargo-domain";
import { shipmentTimelineRepository } from "../repositories/shipment-timeline.repository";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";
import { AppError } from "@/lib/errors";

const TIMELINE_EVENT_META: Record<
  string,
  { title: string; visibility: "CUSTOMER" | "INTERNAL" | "SYSTEM" }
> = {
  [CargoEventType.EXPORT_CREATED]: { title: "Shipment Created", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_PICKUP_ASSIGNED]: { title: "Pickup Assigned", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_PICKED_UP]: { title: "Picked Up", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_AT_ORIGIN_WAREHOUSE]: { title: "Arrived at Origin Warehouse", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_CONSOLIDATED]: { title: "Consolidated", visibility: "INTERNAL" },
  [CargoEventType.EXPORT_CUSTOMS_DECLARATION_SUBMITTED]: { title: "Customs Declaration Submitted", visibility: "CUSTOMER" },
  [CargoEventType.CUSTOMS_UNDER_REVIEW]: { title: "Under Customs Review", visibility: "CUSTOMER" },
  [CargoEventType.CUSTOMS_HOLD_ISSUED]: { title: "Customs Hold", visibility: "CUSTOMER" },
  [CargoEventType.CUSTOMS_QUERY_ISSUED]: { title: "Customs Query", visibility: "CUSTOMER" },
  [CargoEventType.CUSTOMS_APPROVED]: { title: "Customs Approved", visibility: "CUSTOMER" },
  [CargoEventType.CUSTOMS_RELEASED]: { title: "Customs Released", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_MANIFESTED]: { title: "Manifested", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_LOADED_TO_AIRLINE]: { title: "Loaded to Airline", visibility: "CUSTOMER" },
  [CargoEventType.EXPORT_IN_TRANSIT]: { title: "In Transit", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_ARRIVED_AT_HUB]: { title: "Arrived at Destination Hub", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_CUSTOMS_DECLARATION_SUBMITTED]: { title: "Import Customs Declared", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_UNDER_CLEARANCE]: { title: "Under Import Clearance", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_CUSTOMS_HOLD]: { title: "Import Customs Hold", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_CUSTOMS_QUERY]: { title: "Import Customs Query", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_CLEARED]: { title: "Import Cleared", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_RELEASED]: { title: "Released from Customs", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_AT_DESTINATION_WAREHOUSE]: { title: "At Destination Warehouse", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_READY_FOR_DELIVERY]: { title: "Ready for Delivery", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_OUT_FOR_DELIVERY]: { title: "Out for Delivery", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_DELIVERED]: { title: "Delivered", visibility: "CUSTOMER" },
  [CargoEventType.IMPORT_SIGNED]: { title: "Signed", visibility: "CUSTOMER" },
  [CargoEventType.WAREHOUSE_RECEIVED]: { title: "Warehouse Received", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_STORED]: { title: "Warehouse Stored", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_CONSOLIDATED]: { title: "Warehouse Consolidated", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_MANIFESTED]: { title: "Warehouse Manifested", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_READY_FOR_DISPATCH]: { title: "Ready for Dispatch", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_DISPATCHED]: { title: "Dispatched from Warehouse", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_HELD]: { title: "Warehouse Hold", visibility: "INTERNAL" },
  [CargoEventType.WAREHOUSE_EXCEPTION]: { title: "Warehouse Exception", visibility: "CUSTOMER" },
  [CargoEventType.BILLING_INVOICED]: { title: "Invoice Issued", visibility: "CUSTOMER" },
  [CargoEventType.BILLING_PARTIAL_PAYMENT]: { title: "Partial Payment Received", visibility: "CUSTOMER" },
  [CargoEventType.BILLING_PAID]: { title: "Payment Complete", visibility: "CUSTOMER" },
  [CargoEventType.BILLING_REFUND]: { title: "Refund Issued", visibility: "CUSTOMER" },
};

export interface AddTimelineEventParams {
  aggregateId: string;
  aggregateType: "MasterAWB" | "HouseAWB";
  eventType: CargoEventType;
  userId: string;
  stationId?: string;
  location?: { latitude: number; longitude: number; address: string };
  metadata?: Record<string, unknown>;
}

export interface TimelineQuery {
  aggregateId: string;
  aggregateType: "MasterAWB" | "HouseAWB";
  visibility?: "CUSTOMER" | "INTERNAL" | "SYSTEM";
  fromDate?: Date;
  toDate?: Date;
  eventTypes?: CargoEventType[];
  limit?: number;
  offset?: number;
}

export class ShipmentTimelineService {
  async addEvent(params: AddTimelineEventParams) {
    const meta = TIMELINE_EVENT_META[params.eventType];
    if (!meta) {
      throw new AppError(`Unknown event type: ${params.eventType}`, 422, "INVALID_EVENT_TYPE");
    }

    const event = await shipmentTimelineRepository.create({
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      eventType: params.eventType,
      title: meta.title,
      userId: params.userId,
      stationId: params.stationId,
      visibility: meta.visibility,
      metadata: params.metadata,
      latitude: params.location?.latitude,
      longitude: params.location?.longitude,
      address: params.location?.address,
    });

    await eventBus.publish(
      createEvent("timeline.event_created", "Timeline", event.id, {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        title: event.title,
        visibility: event.visibility,
        timestamp: event.createdAt,
      }, params.userId)
    );

    if (meta.visibility === "CUSTOMER") {
      await createAuditLog({
        userId: params.userId,
        action: "UPDATE",
        entity: params.aggregateType,
        entityId: params.aggregateId,
        metadata: {
          eventType: params.eventType,
          title: event.title,
          timestamp: event.createdAt,
        },
      });
    }

    return event;
  }

  async getTimeline(query: TimelineQuery) {
    return shipmentTimelineRepository.findByAggregate(
      query.aggregateId,
      query.aggregateType,
      {
        visibility: query.visibility,
        fromDate: query.fromDate,
        toDate: query.toDate,
        eventTypes: query.eventTypes,
        limit: query.limit,
        offset: query.offset,
      }
    );
  }

  async getCustomerVisibleTimeline(aggregateId: string, aggregateType: "MasterAWB" | "HouseAWB") {
    return this.getTimeline({ aggregateId, aggregateType, visibility: "CUSTOMER" });
  }

  async getInternalTimeline(aggregateId: string, aggregateType: "MasterAWB" | "HouseAWB") {
    return this.getTimeline({ aggregateId, aggregateType, visibility: "INTERNAL" });
  }

  getCustomerVisibleEventTypes(): CargoEventType[] {
    return Object.entries(TIMELINE_EVENT_META)
      .filter(([_, meta]) => meta.visibility === "CUSTOMER")
      .map(([key]) => key as CargoEventType);
  }

  getInternalVisibleEventTypes(): CargoEventType[] {
    return Object.entries(TIMELINE_EVENT_META)
      .filter(([_, meta]) => meta.visibility === "INTERNAL")
      .map(([key]) => key as CargoEventType);
  }

  async addReceived(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.WAREHOUSE_RECEIVED });
  }

  async addPacked(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.EXPORT_AT_ORIGIN_WAREHOUSE });
  }

  async addConsolidated(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.EXPORT_CONSOLIDATED });
  }

  async addManifested(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.EXPORT_MANIFESTED });
  }

  async addLoaded(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.EXPORT_LOADED_TO_AIRLINE });
  }

  async addDeparted(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.EXPORT_IN_TRANSIT });
  }

  async addArrived(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.IMPORT_ARRIVED_AT_HUB });
  }

  async addCustomsEvent(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: params.eventType });
  }

  async addDelivered(params: AddTimelineEventParams) {
    return this.addEvent({ ...params, eventType: CargoEventType.IMPORT_DELIVERED });
  }
}

export const shipmentTimelineService = new ShipmentTimelineService();
