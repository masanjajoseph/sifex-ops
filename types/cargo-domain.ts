import { z } from "zod";

export enum WorkflowStage {
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  WAREHOUSE = "WAREHOUSE",
  DELIVERY = "DELIVERY",
  COMPLETED = "COMPLETED",
}

export enum CargoStatus {
  INITIATED = "INITIATED",
  ACCEPTED = "ACCEPTED",
  RCS = "RCS",
  LOADED = "LOADED",
  MANIFESTED = "MANIFESTED",
  OFFLOADED = "OFFLOADED",
  DEPARTED = "DEPARTED",
  IN_TRANSIT = "IN_TRANSIT",
  ARRIVED = "ARRIVED",
  UNDER_CLEARANCE = "UNDER_CLEARANCE",
  CUSTOMS_QUERY = "CUSTOMS_QUERY",
  CUSTOMS_HOLD = "CUSTOMS_HOLD",
  RELEASED = "RELEASED",
  AWAITING_DELIVERY = "AWAITING_DELIVERY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
  POD_SIGNED = "POD_SIGNED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMode {
  PP = "PP",
  CC = "CC",
}

export enum ShipmentType {
  CAN_GUANGZHOU = "CAN_GUANGZHOU",
  HKG_HONGKONG = "HKG_HONGKONG",
  DXB_DUBAI = "DXB_DUBAI",
  CAN_EXPRESS = "CAN_EXPRESS",
  MCO_EXPRESS = "MCO_EXPRESS",
}

export enum StationCode {
  CAN = "CAN",
  HKG = "HKG",
  DAR = "DAR",
  DXB = "DXB",
  NBO = "NBO",
  SHJ = "SHJ",
  JNB = "JNB",
  MCT = "MCT",
  BOM = "BOM",
  ADD = "ADD",
  ZNZ = "ZNZ",
}

export enum BillingStatus {
  NOT_BILLED = "NOT_BILLED", DRAFT = "DRAFT", INVOICED = "INVOICED",
  UNPAID = "UNPAID", PARTIAL_PAID = "PARTIAL_PAID", PAID = "PAID",
  CREDITED = "CREDITED", REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  CARD = "CARD",
  MOBILE = "MOBILE",
  LIPA_NAMBA = "LIPA_NAMBA",
  BANK = "BANK",
  CASH = "CASH",
}

export enum WarehouseStatus {
  RECEIVED = "RECEIVED", RACKED = "RACKED", PICKED = "PICKED",
  LOADED = "LOADED", OFFLOADED = "OFFLOADED", RELEASED = "RELEASED",
  READY_FOR_DISPATCH = "READY_FOR_DISPATCH", DISPATCHED = "DISPATCHED",
}

// Backward compatibility aliases for Phase 2.1 engine files
export enum HouseAWBStatus {
  EXPORT_CREATED = "EXPORT_CREATED",
  EXPORT_PICKUP_ASSIGNED = "EXPORT_PICKUP_ASSIGNED",
  EXPORT_PICKED_UP = "EXPORT_PICKED_UP",
  EXPORT_AT_ORIGIN_WAREHOUSE = "EXPORT_AT_ORIGIN_WAREHOUSE",
  EXPORT_CONSOLIDATED = "EXPORT_CONSOLIDATED",
  EXPORT_CUSTOMS_DECLARATION_SUBMITTED = "EXPORT_CUSTOMS_DECLARATION_SUBMITTED",
  EXPORT_UNDER_CLEARANCE = "EXPORT_UNDER_CLEARANCE",
  EXPORT_CUSTOMS_HOLD = "EXPORT_CUSTOMS_HOLD",
  EXPORT_CUSTOMS_QUERY = "EXPORT_CUSTOMS_QUERY",
  EXPORT_CLEARED = "EXPORT_CLEARED",
  EXPORT_RELEASED = "EXPORT_RELEASED",
  EXPORT_MANIFESTED = "EXPORT_MANIFESTED",
  EXPORT_LOADED_TO_AIRLINE = "EXPORT_LOADED_TO_AIRLINE",
  EXPORT_IN_TRANSIT = "EXPORT_IN_TRANSIT",
  IMPORT_ARRIVED_AT_HUB = "IMPORT_ARRIVED_AT_HUB",
  IMPORT_CUSTOMS_DECLARATION_SUBMITTED = "IMPORT_CUSTOMS_DECLARATION_SUBMITTED",
  IMPORT_UNDER_CLEARANCE = "IMPORT_UNDER_CLEARANCE",
  IMPORT_CUSTOMS_HOLD = "IMPORT_CUSTOMS_HOLD",
  IMPORT_CUSTOMS_QUERY = "IMPORT_CUSTOMS_QUERY",
  IMPORT_CLEARED = "IMPORT_CLEARED",
  IMPORT_RELEASED = "IMPORT_RELEASED",
  IMPORT_AT_DESTINATION_WAREHOUSE = "IMPORT_AT_DESTINATION_WAREHOUSE",
  IMPORT_READY_FOR_DELIVERY = "IMPORT_READY_FOR_DELIVERY",
  IMPORT_OUT_FOR_DELIVERY = "IMPORT_OUT_FOR_DELIVERY",
  IMPORT_DELIVERED = "IMPORT_DELIVERED",
  IMPORT_SIGNED = "IMPORT_SIGNED",
  EXCEPTION_LOST = "EXCEPTION_LOST",
  EXCEPTION_DAMAGED = "EXCEPTION_DAMAGED",
  EXCEPTION_RETURNED = "EXCEPTION_RETURNED",
}

export enum MasterAWBStatus {
  CREATED = "CREATED",
  CONSOLIDATING = "CONSOLIDATING",
  CONSOLIDATED = "CONSOLIDATED",
  MANIFESTING = "MANIFESTING",
  MANIFESTED = "MANIFESTED",
  LOADING_TO_AIRLINE = "LOADING_TO_AIRLINE",
  LOADED_TO_AIRLINE = "LOADED_TO_AIRLINE",
  DEPARTED = "DEPARTED",
  IN_TRANSIT = "IN_TRANSIT",
  ARRIVED = "ARRIVED",
  CUSTOMS_CLEARANCE = "CUSTOMS_CLEARANCE",
  CLEARED = "CLEARED",
  RELEASED = "RELEASED",
  CLOSED = "CLOSED",
}

export enum ScanEventType {
  SCAN_PICKUP = "SCAN_PICKUP",
  SCAN_ARRIVAL_AT_WAREHOUSE = "SCAN_ARRIVAL_AT_WAREHOUSE",
  SCAN_CONSOLIDATION = "SCAN_CONSOLIDATION",
  SCAN_MANIFESTING = "SCAN_MANIFESTING",
  SCAN_LOADING_TO_AIRLINE = "SCAN_LOADING_TO_AIRLINE",
  SCAN_DEPARTURE = "SCAN_DEPARTURE",
  SCAN_ARRIVAL_AT_HUB = "SCAN_ARRIVAL_AT_HUB",
  SCAN_CUSTOMS_SUBMISSION = "SCAN_CUSTOMS_SUBMISSION",
  SCAN_CUSTOMS_CLEARANCE = "SCAN_CUSTOMS_CLEARANCE",
  SCAN_WAREHOUSE_RELEASE = "SCAN_WAREHOUSE_RELEASE",
  SCAN_OUT_FOR_DELIVERY = "SCAN_OUT_FOR_DELIVERY",
  SCAN_DELIVERY = "SCAN_DELIVERY",
  SCAN_RETURN_TO_WAREHOUSE = "SCAN_RETURN_TO_WAREHOUSE",
}

export enum CargoEventType {
  EXPORT_CREATED = "EXPORT_CREATED",
  EXPORT_PICKUP_ASSIGNED = "EXPORT_PICKUP_ASSIGNED",
  EXPORT_PICKED_UP = "EXPORT_PICKED_UP",
  EXPORT_AT_ORIGIN_WAREHOUSE = "EXPORT_AT_ORIGIN_WAREHOUSE",
  EXPORT_CONSOLIDATED = "EXPORT_CONSOLIDATED",
  EXPORT_CUSTOMS_DECLARATION_SUBMITTED = "EXPORT_CUSTOMS_DECLARATION_SUBMITTED",
  EXPORT_UNDER_CLEARANCE = "EXPORT_UNDER_CLEARANCE",
  EXPORT_CUSTOMS_HOLD = "EXPORT_CUSTOMS_HOLD",
  EXPORT_CUSTOMS_QUERY = "EXPORT_CUSTOMS_QUERY",
  EXPORT_CLEARED = "EXPORT_CLEARED",
  EXPORT_RELEASED = "EXPORT_RELEASED",
  EXPORT_MANIFESTED = "EXPORT_MANIFESTED",
  EXPORT_LOADED_TO_AIRLINE = "EXPORT_LOADED_TO_AIRLINE",
  EXPORT_IN_TRANSIT = "EXPORT_IN_TRANSIT",
  IMPORT_ARRIVED_AT_HUB = "IMPORT_ARRIVED_AT_HUB",
  IMPORT_CUSTOMS_DECLARATION_SUBMITTED = "IMPORT_CUSTOMS_DECLARATION_SUBMITTED",
  IMPORT_UNDER_CLEARANCE = "IMPORT_UNDER_CLEARANCE",
  IMPORT_CUSTOMS_HOLD = "IMPORT_CUSTOMS_HOLD",
  IMPORT_CUSTOMS_QUERY = "IMPORT_CUSTOMS_QUERY",
  IMPORT_CLEARED = "IMPORT_CLEARED",
  IMPORT_RELEASED = "IMPORT_RELEASED",
  IMPORT_AT_DESTINATION_WAREHOUSE = "IMPORT_AT_DESTINATION_WAREHOUSE",
  IMPORT_READY_FOR_DELIVERY = "IMPORT_READY_FOR_DELIVERY",
  IMPORT_OUT_FOR_DELIVERY = "IMPORT_OUT_FOR_DELIVERY",
  IMPORT_DELIVERED = "IMPORT_DELIVERED",
  IMPORT_SIGNED = "IMPORT_SIGNED",
  WAREHOUSE_RECEIVED = "WAREHOUSE_RECEIVED",
  WAREHOUSE_STORED = "WAREHOUSE_STORED",
  WAREHOUSE_CONSOLIDATED = "WAREHOUSE_CONSOLIDATED",
  WAREHOUSE_MANIFESTED = "WAREHOUSE_MANIFESTED",
  WAREHOUSE_READY_FOR_DISPATCH = "WAREHOUSE_READY_FOR_DISPATCH",
  WAREHOUSE_DISPATCHED = "WAREHOUSE_DISPATCHED",
  WAREHOUSE_HELD = "WAREHOUSE_HELD",
  WAREHOUSE_EXCEPTION = "WAREHOUSE_EXCEPTION",
  CUSTOMS_DECLARATION_SUBMITTED = "CUSTOMS_DECLARATION_SUBMITTED",
  CUSTOMS_UNDER_REVIEW = "CUSTOMS_UNDER_REVIEW",
  CUSTOMS_HOLD_ISSUED = "CUSTOMS_HOLD_ISSUED",
  CUSTOMS_QUERY_ISSUED = "CUSTOMS_QUERY_ISSUED",
  CUSTOMS_APPROVED = "CUSTOMS_APPROVED",
  CUSTOMS_RELEASED = "CUSTOMS_RELEASED",
  BILLING_INVOICED = "BILLING_INVOICED",
  BILLING_PARTIAL_PAYMENT = "BILLING_PARTIAL_PAYMENT",
  BILLING_PAID = "BILLING_PAID",
  BILLING_REFUND = "BILLING_REFUND",
}

export enum CustomsStatus {
  DECLARED = "DECLARED",
  UNDER_REVIEW = "UNDER_REVIEW",
  HOLD = "HOLD",
  QUERY_ISSUED = "QUERY_ISSUED",
  QUERY_RESPONDED = "QUERY_RESPONDED",
  APPROVED = "APPROVED",
  RELEASED = "RELEASED",
  REJECTED = "REJECTED",
  ESCALATED = "ESCALATED",
  MANUAL_INSPECTION = "MANUAL_INSPECTION",
}

export enum WarehouseInventoryStatus {
  RECEIVED = "RECEIVED",
  RACKED = "RACKED",
  STORED = "STORED",
  PICKED = "PICKED",
  LOADED = "LOADED",
  OFFLOADED = "OFFLOADED",
  RELEASED = "RELEASED",
  CONSOLIDATED = "CONSOLIDATED",
  MANIFESTED = "MANIFESTED",
  READY_FOR_DISPATCH = "READY_FOR_DISPATCH",
  DISPATCHED = "DISPATCHED",
  HELD = "HELD",
  EXCEPTION = "EXCEPTION",
}

export enum ManifestStatus {
  CREATED = "CREATED",
  SUBMITTED_TO_AIRLINE = "SUBMITTED_TO_AIRLINE",
  CONFIRMED_BY_AIRLINE = "CONFIRMED_BY_AIRLINE",
  LOADED_TO_AIRCRAFT = "LOADED_TO_AIRCRAFT",
  DEPARTED = "DEPARTED",
  ARRIVED = "ARRIVED",
  SUBMITTED_TO_CUSTOMS = "SUBMITTED_TO_CUSTOMS",
  CUSTOMS_APPROVED = "CUSTOMS_APPROVED",
  CLOSED = "CLOSED",
}

export interface MasterAWB {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  orderNumber?: string;
  senderName: string;
  senderAddress: string;
  senderCompany?: string;
  senderPhone?: string;
  senderCity?: string;
  senderCountry?: string;
  receiverName: string;
  receiverAddress: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverCity?: string;
  receiverCountry?: string;
  description?: string;
  freight: number;
  freightRate: number;
  insurance: number;
  awbPieces: number;
  awbWeight: number;
  chargeableWeight: number;
  volumeWeight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  currency: string;
  customsValue: number;
  paymentMode: PaymentMode;
  shipmentType: ShipmentType;
  receivedAt?: Date;
  expectedArrivalDate?: Date;
  cargoStatus: CargoStatus;
  warehouseStatus: WarehouseStatus;
  billingStatus: BillingStatus;
  originStationId: string;
  destinationStationId: string;
  currentStationId?: string;
  airlineId: string;
  flightNumber: string;
  departureTime: Date;
  arrivalTime: Date;
  manifestId?: string;
  manifestNumber?: string;
  customsDeclarationId?: string;
  customsStatus: string;
  masterAWBBillingId?: string;
  createdAt: Date;
  consolidatedAt?: Date;
  manifestedAt?: Date;
  departedAt?: Date;
  arrivedAt?: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export interface HouseAWB {
  id: string;
  masterAWBId?: string;
  houseAWBNumber: string;
  trackingNumber: string;
  orderNumber?: string;
  shipperId: string;
  receiverId: string;
  description?: string;
  pieces: number;
  weight: number;
  volume: number;
  chargeableWeight: number;
  volumeWeight: number;
  length: number;
  width: number;
  height: number;
  freight?: number;
  freightRate?: number;
  insurance?: number;
  currency: string;
  customsValue: number;
  paymentMode: PaymentMode;
  shipmentType: ShipmentType;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  cargoStatus: CargoStatus;
  warehouseStatus: WarehouseStatus;
  billingStatus: BillingStatus;
  paymentMethod?: PaymentMethod;
  receivedAt?: Date;
  expectedArrivalDate?: Date;
  houseAWBBillingId?: string;
  customsDeclarationId?: string;
  createdAt: Date;
  pickedUpAt?: Date;
  consolidatedAt?: Date;
  deliveredAt?: Date;
  signedAt?: Date;
  updatedAt: Date;
}

export interface Parcel {
  id: string;
  houseAWBId: string;
  parcelTrackingNumber: string;
  barcode: string;
  qrCode?: string;
  serialNumber?: string;
  description: string;
  quantity: number;
  actualWeight: number;
  volumetricWeight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  value: number;
  hsCode: string;
  packageType: string;
  condition: string;
  warehouseLocationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseLocation {
  id: string;
  warehouse: string;
  zone: string;
  rack: string;
  shelf: string;
  bay: string;
  bin: string;
  floor: string;
  assignedAt?: Date;
  movedAt?: Date;
  releasedAt?: Date;
}

export interface FreightRate {
  id: string;
  shipmentType: ShipmentType;
  minimumWeight: number;
  maximumWeight: number;
  ratePerKg: number;
  currency: string;
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
}

export interface TrackingEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  status: string;
  title: string;
  description?: string;
  userId: string;
  stationId?: string;
  scanSource?: string;
  remarks?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  metadata?: Record<string, unknown>;
  visibleToCustomer: boolean;
  createdAt: Date;
}

export interface SystemSettings {
  id: string;
  defaultCurrency: string;
  exchangeRate: number;
  taxPercentage: number;
  defaultChargeableDivisor: number;
  autoGenerateTracking: boolean;
  trackingPrefix: string;
  companyName: string;
  companyCode: string;
  operationalStations: string[];
}

export interface Customer {
  id: string;
  type: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  registrationNo?: string;
  kycStatus: string;
  kycVerifiedAt?: Date;
  kycVerifiedBy?: string;
  creditLimit: number;
  creditBalance: number;
  paymentTerms: string;
  isActive: boolean;
}

export interface QuotationRequest {
  id: string;
  customerId: string;
  quoteNumber: string;
  status: string;
  shipmentType?: ShipmentType;
  description?: string;
  pieces: number;
  weight: number;
  volume: number;
  chargeableWeight: number;
  originStationId?: string;
  destinationStationId?: string;
  freightCost: number;
  transportCost: number;
  warehouseCost: number;
  customsCost: number;
  consolidationCost: number;
  totalAmount: number;
  currency: string;
  validUntil?: Date;
}

export const AcceptShipmentSchema = z.object({
  sender: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    company: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
  receiver: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    company: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
  parcels: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      actualWeight: z.number().positive(),
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      hsCode: z.string().min(1),
      packageType: z.string().min(1),
      value: z.number().nonnegative().optional(),
    })
  ).min(1),
  shipmentType: z.nativeEnum(ShipmentType),
  paymentMode: z.nativeEnum(PaymentMode),
  currency: z.string().default("USD"),
  customsValue: z.number().nonnegative(),
  originStationId: z.string().uuid(),
  destinationStationId: z.string().uuid(),
  hsCode: z.string().min(1),
  originCountry: z.string().min(1),
  destinationCountry: z.string().min(1),
  description: z.string().optional(),
  orderNumber: z.string().optional(),
  expectedArrivalDate: z.string().datetime().optional(),
});

export const TrackingEventCreateSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  eventType: z.string().min(1),
  status: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  userId: z.string().uuid(),
  stationId: z.string().uuid().optional(),
  scanSource: z.string().optional(),
  remarks: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  visibleToCustomer: z.boolean().default(true),
});

export const FreightRateSchema = z.object({
  shipmentType: z.nativeEnum(ShipmentType),
  ratePerKg: z.number().nonnegative(),
  currency: z.string().default("USD"),
  isActive: z.boolean().default(true),
});

export type AcceptShipmentInput = z.infer<typeof AcceptShipmentSchema>;
export type TrackingEventCreateInput = z.infer<typeof TrackingEventCreateSchema>;
export type FreightRateInput = z.infer<typeof FreightRateSchema>;
