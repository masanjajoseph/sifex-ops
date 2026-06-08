export const CARGO_EVENTS = {
  // Master AWB events
  MASTER_AWB_CREATED: "master_awb.created",
  MASTER_AWB_CONSOLIDATED: "master_awb.consolidated",
  MASTER_AWB_MANIFESTED: "master_awb.manifested",
  MASTER_AWB_LOADED: "master_awb.loaded",
  MASTER_AWB_DEPARTED: "master_awb.departed",
  MASTER_AWB_ARRIVED: "master_awb.arrived",
  MASTER_AWB_CLEARED: "master_awb.cleared",
  MASTER_AWB_CLOSED: "master_awb.closed",
  MASTER_AWB_HOUSE_ATTACHED: "master_awb.house_attached",
  MASTER_AWB_HOUSE_DETACHED: "master_awb.house_detached",
  MASTER_AWB_FLIGHT_UPDATED: "master_awb.flight_updated",

  // House AWB events
  HOUSE_AWB_CREATED: "house_awb.created",
  HOUSE_AWB_STATUS_CHANGED: "house_awb.status_changed",
  HOUSE_AWB_ATTACHED_TO_MASTER: "house_awb.attached_to_master",
  HOUSE_AWB_DETACHED_FROM_MASTER: "house_awb.detached_from_master",
  HOUSE_AWB_PARCEL_ADDED: "house_awb.parcel_added",
  HOUSE_AWB_PARCEL_REMOVED: "house_awb.parcel_removed",

  // Scan events
  SCAN_RECEIVED: "scan.received",
  SCAN_PACKED: "scan.packed",
  SCAN_MANIFESTED: "scan.manifested",
  SCAN_LOADED: "scan.loaded",
  SCAN_DEPARTED: "scan.departed",
  SCAN_ARRIVED: "scan.arrived",
  SCAN_CUSTOMS_HOLD: "scan.customs_hold",
  SCAN_CUSTOMS_RELEASED: "scan.customs_released",
  SCAN_WAREHOUSE_RECEIVED: "scan.warehouse_received",
  SCAN_READY_FOR_PICKUP: "scan.ready_for_pickup",
  SCAN_OUT_FOR_DELIVERY: "scan.out_for_delivery",
  SCAN_DELIVERED: "scan.delivered",
  SCAN_RETURNED: "scan.returned",

  // Timeline events
  TIMELINE_EVENT_CREATED: "timeline.event_created",
} as const;

export type CargoEventType = (typeof CARGO_EVENTS)[keyof typeof CARGO_EVENTS];
