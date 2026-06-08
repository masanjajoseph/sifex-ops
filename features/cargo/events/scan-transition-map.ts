import { HouseAWBStatus, ScanEventType } from "@/types/cargo-domain";

/**
 * Maps ScanEventType to the resulting HouseAWBStatus after processing.
 * Each scan event represents a physical action that triggers a state
 * transition in the shipment lifecycle.
 */
export const HOUSE_AWB_SCAN_MAP: Record<ScanEventType, HouseAWBStatus> = {
  [ScanEventType.SCAN_PICKUP]: HouseAWBStatus.EXPORT_PICKED_UP,
  [ScanEventType.SCAN_ARRIVAL_AT_WAREHOUSE]: HouseAWBStatus.EXPORT_AT_ORIGIN_WAREHOUSE,
  [ScanEventType.SCAN_CONSOLIDATION]: HouseAWBStatus.EXPORT_CONSOLIDATED,
  [ScanEventType.SCAN_MANIFESTING]: HouseAWBStatus.EXPORT_MANIFESTED,
  [ScanEventType.SCAN_LOADING_TO_AIRLINE]: HouseAWBStatus.EXPORT_LOADED_TO_AIRLINE,
  [ScanEventType.SCAN_DEPARTURE]: HouseAWBStatus.EXPORT_IN_TRANSIT,
  [ScanEventType.SCAN_ARRIVAL_AT_HUB]: HouseAWBStatus.IMPORT_ARRIVED_AT_HUB,
  [ScanEventType.SCAN_CUSTOMS_SUBMISSION]: HouseAWBStatus.IMPORT_CUSTOMS_DECLARATION_SUBMITTED,
  [ScanEventType.SCAN_CUSTOMS_CLEARANCE]: HouseAWBStatus.IMPORT_CLEARED,
  [ScanEventType.SCAN_WAREHOUSE_RELEASE]: HouseAWBStatus.IMPORT_RELEASED,
  [ScanEventType.SCAN_OUT_FOR_DELIVERY]: HouseAWBStatus.IMPORT_OUT_FOR_DELIVERY,
  [ScanEventType.SCAN_DELIVERY]: HouseAWBStatus.IMPORT_DELIVERED,
  [ScanEventType.SCAN_RETURN_TO_WAREHOUSE]: HouseAWBStatus.EXCEPTION_RETURNED,
};
