import { eventBus, DomainEvent } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";
import { shipmentTimelineService } from "../timeline/shipment-timeline.service";
import { CargoEventType } from "@/types/cargo-domain";
import { CARGO_EVENTS } from "./cargo-event-types";

function mapEventTypeToCargoEvent(eventType: string): CargoEventType | undefined {
  const mapping: Record<string, CargoEventType> = {
    "house_awb.created": CargoEventType.EXPORT_CREATED,
    "house_awb.status_changed": CargoEventType.EXPORT_CREATED,
    "master_awb.created": CargoEventType.EXPORT_CREATED,
    "master_awb.consolidated": CargoEventType.WAREHOUSE_CONSOLIDATED,
    "master_awb.manifested": CargoEventType.EXPORT_MANIFESTED,
    "master_awb.loaded": CargoEventType.EXPORT_LOADED_TO_AIRLINE,
    "master_awb.departed": CargoEventType.EXPORT_IN_TRANSIT,
    "master_awb.arrived": CargoEventType.IMPORT_ARRIVED_AT_HUB,
    "scan.received": CargoEventType.WAREHOUSE_RECEIVED,
    "scan.packed": CargoEventType.WAREHOUSE_RECEIVED,
    "scan.manifested": CargoEventType.EXPORT_MANIFESTED,
    "scan.loaded": CargoEventType.EXPORT_LOADED_TO_AIRLINE,
    "scan.departed": CargoEventType.EXPORT_IN_TRANSIT,
    "scan.arrived": CargoEventType.IMPORT_ARRIVED_AT_HUB,
    "scan.customs_hold": CargoEventType.CUSTOMS_HOLD_ISSUED,
    "scan.customs_released": CargoEventType.CUSTOMS_RELEASED,
    "scan.warehouse_received": CargoEventType.WAREHOUSE_RECEIVED,
    "scan.ready_for_pickup": CargoEventType.IMPORT_READY_FOR_DELIVERY,
    "scan.out_for_delivery": CargoEventType.IMPORT_OUT_FOR_DELIVERY,
    "scan.delivered": CargoEventType.IMPORT_DELIVERED,
    "scan.returned": CargoEventType.WAREHOUSE_EXCEPTION,
    "customs.declaration_submitted": CargoEventType.CUSTOMS_DECLARATION_SUBMITTED,
    "customs.hold_issued": CargoEventType.CUSTOMS_HOLD_ISSUED,
    "customs.released": CargoEventType.CUSTOMS_RELEASED,
    "billing.charges_calculated": CargoEventType.BILLING_INVOICED,
    "billing.invoiced": CargoEventType.BILLING_INVOICED,
    "billing.paid": CargoEventType.BILLING_PAID,
  };

  return mapping[eventType];
}

function getAggregateType(eventType: string): "MasterAWB" | "HouseAWB" {
  if (eventType.includes("master_awb") || eventType.includes("manifest")) {
    return "MasterAWB";
  }
  return "HouseAWB";
}

export function registerCargoEventHandlers(): void {
  // Handle Master AWB events
  const masterAWBEvents = [
    "master_awb.created",
    "master_awb.consolidated",
    "master_awb.house_attached",
    "master_awb.house_detached",
    "master_awb.manifested",
    "master_awb.loaded",
    "master_awb.departed",
    "master_awb.arrived",
    "master_awb.flight_updated",
    "master_awb.closed",
  ];

  for (const eventType of masterAWBEvents) {
    eventBus.subscribe(eventType, async (event: DomainEvent) => {
      const cargoEvent = mapEventTypeToCargoEvent(event.eventType);

      await shipmentTimelineService.addEvent({
        aggregateId: event.aggregateId,
        aggregateType: "MasterAWB",
        eventType: cargoEvent ?? CargoEventType.EXPORT_CREATED,
        userId: event.userId ?? "system",
        stationId: event.payload?.stationId as string | undefined,
        metadata: event.payload as Record<string, unknown> | undefined,
      });

      await createAuditLog({
        userId: event.userId ?? "system",
        action: "UPDATE",
        entity: "MasterAWB",
        entityId: event.aggregateId,
        metadata: {
          eventType: event.eventType,
          ...event.payload,
        },
      });
    });
  }

  // Handle House AWB events
  const houseAWBEvents = [
    "house_awb.created",
    "house_awb.status_changed",
    "house_awb.parcel_added",
    "house_awb.parcel_removed",
    "house_awb.attached_to_master",
    "house_awb.detached_from_master",
  ];

  for (const eventType of houseAWBEvents) {
    eventBus.subscribe(eventType, async (event: DomainEvent) => {
      const cargoEvent = mapEventTypeToCargoEvent(event.eventType);

      await shipmentTimelineService.addEvent({
        aggregateId: event.aggregateId,
        aggregateType: "HouseAWB",
        eventType: cargoEvent ?? CargoEventType.EXPORT_CREATED,
        userId: event.userId ?? "system",
        metadata: event.payload as Record<string, unknown> | undefined,
      });
    });
  }

  // Handle scan events
  eventBus.subscribe("scan.event_processed", async (event: DomainEvent) => {
    const cargoEvent = mapEventTypeToCargoEvent(event.eventType);
    const payload = event.payload as Record<string, unknown> | undefined;

    if (payload?.targetStatus) {
      const aggregateType = getAggregateType(event.eventType);

      await shipmentTimelineService.addEvent({
        aggregateId: event.aggregateId,
        aggregateType,
        eventType: cargoEvent ?? CargoEventType.WAREHOUSE_RECEIVED,
        userId: event.userId ?? "system",
        stationId: payload?.stationId as string | undefined,
        location: payload?.location as any,
        metadata: payload,
      });
    }
  });

  // Handle customs events
  eventBus.subscribe("customs.declaration_submitted", async (event: DomainEvent) => {
    await shipmentTimelineService.addEvent({
      aggregateId: event.aggregateId,
      aggregateType: "HouseAWB",
      eventType: CargoEventType.CUSTOMS_DECLARATION_SUBMITTED,
      userId: event.userId ?? "system",
      metadata: event.payload as Record<string, unknown> | undefined,
    });
  });

  eventBus.subscribe("customs.hold_issued", async (event: DomainEvent) => {
    await shipmentTimelineService.addEvent({
      aggregateId: event.aggregateId,
      aggregateType: "HouseAWB",
      eventType: CargoEventType.CUSTOMS_HOLD_ISSUED,
      userId: event.userId ?? "system",
      metadata: event.payload as Record<string, unknown> | undefined,
    });
  });

  eventBus.subscribe("customs.released", async (event: DomainEvent) => {
    await shipmentTimelineService.addEvent({
      aggregateId: event.aggregateId,
      aggregateType: "HouseAWB",
      eventType: CargoEventType.CUSTOMS_RELEASED,
      userId: event.userId ?? "system",
      metadata: event.payload as Record<string, unknown> | undefined,
    });
  });

  // Handle billing events
  eventBus.subscribe("billing.charges_calculated", async (event: DomainEvent) => {
    await createAuditLog({
      userId: event.userId ?? "system",
      action: "CREATE",
      entity: "BillingRecord",
      entityId: event.aggregateId,
      metadata: event.payload as Record<string, unknown>,
    });
  });

  // Handle workflow stage changes
  eventBus.subscribe("workflow.stage_changed", async (event: DomainEvent) => {
    const { entityType, entityId, oldStage, newStage, cargoStatus } = event.payload as Record<string, unknown>;

    await shipmentTimelineService.addEvent({
      aggregateId: entityId as string,
      aggregateType: entityType as "MasterAWB" | "HouseAWB",
      eventType: CargoEventType.EXPORT_CREATED,
      userId: event.userId ?? "system",
      metadata: {
        field: "workflowStage",
        oldValue: oldStage,
        newValue: newStage,
        triggeredBy: `cargoStatus: ${cargoStatus}`,
      },
    });

    await createAuditLog({
      userId: event.userId ?? "system",
      action: "UPDATE",
      entity: entityType as string,
      entityId: entityId as string,
      metadata: {
        field: "workflowStage",
        oldValue: oldStage,
        newValue: newStage,
        triggeredBy: `cargoStatus: ${cargoStatus}`,
      },
    });
  });
}
