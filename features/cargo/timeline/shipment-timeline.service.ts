import { CargoEventType, HouseAWBStatus, MasterAWBStatus } from "@/types/cargo-domain";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";

export interface TimelineEvent {
  id: string;
  aggregateId: string;
  aggregateType: "MasterAWB" | "HouseAWB";
  eventType: CargoEventType;
  title: string;
  description?: string;
  timestamp: Date;
  userId: string;
  stationId?: string;
  location?: { latitude: number; longitude: number; address: string };
  visibility: "CUSTOMER" | "INTERNAL" | "SYSTEM";
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

export class ShipmentTimelineService {
  private events: TimelineEvent[] = [];

  async addEvent(params: {
    aggregateId: string;
    aggregateType: "MasterAWB" | "HouseAWB";
    eventType: CargoEventType;
    userId: string;
    stationId?: string;
    location?: { latitude: number; longitude: number; address: string };
    metadata?: Record<string, unknown>;
  }): Promise<TimelineEvent> {
    const meta = TIMELINE_EVENT_META[params.eventType];
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      eventType: params.eventType,
      title: meta?.title ?? params.eventType,
      timestamp: new Date(),
      userId: params.userId,
      stationId: params.stationId,
      location: params.location,
      visibility: meta?.visibility ?? "INTERNAL",
      metadata: params.metadata,
    };

    // Store in-memory (Prisma persistence handled by repository layer)
    this.events.push(event);

    // Publish timeline event to event bus
    await eventBus.publish(
      createEvent("timeline.event_created", "Timeline", event.id, {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        title: event.title,
        visibility: event.visibility,
        timestamp: event.timestamp,
      }, params.userId)
    );

    // Create audit log for significant events
    if (event.visibility === "CUSTOMER") {
      await createAuditLog({
        userId: params.userId,
        action: "UPDATE",
        entity: params.aggregateType,
        entityId: params.aggregateId,
        metadata: {
          eventType: params.eventType,
          title: event.title,
          timestamp: event.timestamp,
        },
      });
    }

    return event;
  }

  async getTimeline(query: TimelineQuery): Promise<TimelineEvent[]> {
    let result = this.events.filter(
      (e) => e.aggregateId === query.aggregateId && e.aggregateType === query.aggregateType
    );

    if (query.visibility) {
      result = result.filter((e) => e.visibility === query.visibility);
    }

    if (query.fromDate) {
      result = result.filter((e) => e.timestamp >= query.fromDate!);
    }

    if (query.toDate) {
      result = result.filter((e) => e.timestamp <= query.toDate!);
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      result = result.filter((e) => query.eventTypes!.includes(e.eventType));
    }

    // Sort by timestamp descending (most recent first)
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    return result.slice(offset, offset + limit);
  }

  async getCustomerVisibleTimeline(aggregateId: string, aggregateType: "MasterAWB" | "HouseAWB"): Promise<TimelineEvent[]> {
    return this.getTimeline({
      aggregateId,
      aggregateType,
      visibility: "CUSTOMER",
    });
  }

  async getInternalTimeline(aggregateId: string, aggregateType: "MasterAWB" | "HouseAWB"): Promise<TimelineEvent[]> {
    return this.getTimeline({
      aggregateId,
      aggregateType,
      visibility: "INTERNAL",
    });
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
}

export const shipmentTimelineService = new ShipmentTimelineService();
