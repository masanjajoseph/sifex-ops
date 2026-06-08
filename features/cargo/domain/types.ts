import {
  HouseAWBStatus,
  MasterAWBStatus,
  CustomsStatus,
  WarehouseInventoryStatus,
  ManifestStatus,
  BillingStatus,
  ScanEventType,
  CargoEventType,
} from "@/types/cargo-domain";

// Re-export domain enums from shared types
export {
  HouseAWBStatus,
  MasterAWBStatus,
  CustomsStatus,
  WarehouseInventoryStatus,
  ManifestStatus,
  BillingStatus,
  ScanEventType,
  CargoEventType,
};

// ============================================================================
// AGGREGATE ROOT INTERFACES
// ============================================================================

export interface MasterAWBAggregateState {
  id: string;
  organizationId: string;
  originStationId: string;
  destinationStationId: string;
  status: MasterAWBStatus;
  masterAWBNumber: string;

  houseAWBIds: string[];
  totalWeight: number;
  totalVolume: number;
  totalPieces: number;

  airlineId: string;
  flightNumber: string;
  departureTime: Date;
  arrivalTime: Date;

  manifestId?: string;
  manifestNumber?: string;

  customsDeclarationId?: string;
  customsStatus: CustomsStatus;

  masterAWBBillingId?: string;

  createdAt: Date;
  consolidatedAt?: Date;
  manifestedAt?: Date;
  departedAt?: Date;
  arrivedAt?: Date;
  closedAt?: Date;
  deletedAt?: Date;
}

export interface HouseAWBAggregateState {
  id: string;
  organizationId: string;
  masterAWBId?: string;
  status: HouseAWBStatus;

  houseAWBNumber: string;
  shipperId: string;
  recipientId: string;

  parcels: ParcelState[];
  totalWeight: number;
  totalVolume: number;
  totalPieces: number;

  hsCode: string;
  customsValue: number;
  customsCurrency: string;
  originCountry: string;
  destinationCountry: string;

  trackingNumber: string;

  houseAWBBillingId?: string;
  customsDeclarationId?: string;

  createdAt: Date;
  pickedUpAt?: Date;
  consolidatedAt?: Date;
  deliveredAt?: Date;
  signedAt?: Date;
  deletedAt?: Date;
}

export interface ParcelState {
  id: string;
  houseAWBId: string;
  description: string;
  quantity: number;
  weight: number;
  volume: number;
  volumetricWeight: number;
  value: number;
  hsCode: string;
  barcode: string;
  packageType: string;
  condition: string;
  createdAt: Date;
}

// ============================================================================
// COMMAND INTERFACES (CQRS-style commands)
// ============================================================================

export interface CreateMasterAWBCommand {
  organizationId: string;
  originStationId: string;
  destinationStationId: string;
  masterAWBNumber: string;
  airlineId: string;
  flightNumber: string;
  departureTime: Date;
  arrivalTime: Date;
  userId: string;
}

export interface UpdateMasterAWBCommand {
  masterAWBId: string;
  airlineId?: string;
  flightNumber?: string;
  departureTime?: Date;
  arrivalTime?: Date;
  userId: string;
}

export interface AttachHouseAWBCommand {
  masterAWBId: string;
  houseAWBId: string;
  userId: string;
}

export interface DetachHouseAWBCommand {
  masterAWBId: string;
  houseAWBId: string;
  userId: string;
}

export interface CreateHouseAWBCommand {
  organizationId: string;
  shipperId: string;
  recipientId: string;
  hsCode: string;
  customsValue: number;
  customsCurrency: string;
  originCountry: string;
  destinationCountry: string;
  parcels: CreateParcelCommand[];
  userId: string;
}

export interface CreateParcelCommand {
  description: string;
  quantity: number;
  weight: number;
  volume: number;
  value: number;
  hsCode: string;
  packageType: string;
}

export interface TransitionCommand {
  aggregateType: "MASTER_AWB" | "HOUSE_AWB";
  aggregateId: string;
  fromStatus: string;
  toStatus: string;
  userId: string;
  organizationId: string;
  stationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ScanCommand {
  barcode: string;
  eventType: ScanEventType;
  userId: string;
  organizationId: string;
  stationId?: string;
  location?: { latitude: number; longitude: number; address: string };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface TransitionResult {
  success: boolean;
  event?: CargoEventType;
  errors?: string[];
  warnings?: string[];
}

export interface ScanResult {
  success: boolean;
  houseAWBId?: string;
  masterAWBId?: string;
  eventType?: CargoEventType;
  errors?: string[];
}
