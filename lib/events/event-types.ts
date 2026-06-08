// Domain event type definitions

export enum EventType {
  // User events
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",
  USER_LOGIN = "user.login",
  USER_LOGOUT = "user.logout",

  // Shipment events
  SHIPMENT_CREATED = "shipment.created",
  SHIPMENT_STATUS_CHANGED = "shipment.status_changed",
  SHIPMENT_ASSIGNED = "shipment.assigned",
  SHIPMENT_PICKED_UP = "shipment.picked_up",
  SHIPMENT_IN_TRANSIT = "shipment.in_transit",
  SHIPMENT_AT_WAREHOUSE = "shipment.at_warehouse",
  SHIPMENT_OUT_FOR_DELIVERY = "shipment.out_for_delivery",
  SHIPMENT_DELIVERED = "shipment.delivered",
  SHIPMENT_SIGNED = "shipment.signed",
  SHIPMENT_CANCELLED = "shipment.cancelled",
  SHIPMENT_EXCEPTION_REPORTED = "shipment.exception_reported",

  // Master AWB events
  MASTER_AWB_CREATED = "master_awb.created",
  MASTER_AWB_CONSOLIDATED = "master_awb.consolidated",
  MASTER_AWB_MANIFESTED = "master_awb.manifested",
  MASTER_AWB_LOADED = "master_awb.loaded",
  MASTER_AWB_DEPARTED = "master_awb.departed",
  MASTER_AWB_ARRIVED = "master_awb.arrived",
  MASTER_AWB_HOUSE_ATTACHED = "master_awb.house_attached",
  MASTER_AWB_HOUSE_DETACHED = "master_awb.house_detached",

  // House AWB events
  HOUSE_AWB_CREATED = "house_awb.created",
  HOUSE_AWB_STATUS_CHANGED = "house_awb.status_changed",

  // Warehouse events
  CARGO_RECEIVED = "warehouse.cargo_received",
  CARGO_DISPATCHED = "warehouse.cargo_dispatched",
  WAREHOUSE_STORED = "warehouse.stored",
  WAREHOUSE_HELD = "warehouse.held",

  // Scan events
  SCAN_PROCESSED = "scan.processed",
  SCAN_FAILED = "scan.failed",

  // Timeline events
  TIMELINE_EVENT_CREATED = "timeline.event_created",

  // Billing events
  INVOICE_CREATED = "billing.invoice_created",
  PAYMENT_RECEIVED = "billing.payment_received",
  BILLING_CHARGED = "billing.charged",
  BILLING_INVOICED = "billing.invoiced",
  BILLING_PAID = "billing.paid",

  // Delivery events
  DELIVERY_ASSIGNED = "delivery.assigned",
  DELIVERY_COMPLETED = "delivery.completed",
  DELIVERY_STARTED = "delivery.started",
  DELIVERY_FAILED = "delivery.failed",

  // Customs events
  CUSTOMS_DECLARATION_SUBMITTED = "customs.declaration_submitted",
  CUSTOMS_STATUS_CHANGED = "customs.status_changed",
  CUSTOMS_HOLD_ISSUED = "customs.hold_issued",
  CUSTOMS_RELEASED = "customs.released",
}
