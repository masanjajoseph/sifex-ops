// Phase 2: Domain Engine Type Definitions
// This file defines all types for the cargo ERP operational core

import { z } from "zod";

// ============================================================================
// ENUMS: Status & State Machines
// ============================================================================

export enum ShipmentStatus {
  CREATED = "CREATED",
  PENDING_PICKUP = "PENDING_PICKUP",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  AT_WAREHOUSE = "AT_WAREHOUSE",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  SIGNED = "SIGNED",
  CANCELLED = "CANCELLED",
  EXCEPTION = "EXCEPTION",
}

export enum DeliveryStatus {
  UNASSIGNED = "UNASSIGNED",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SIGNED = "SIGNED",
  FAILED = "FAILED",
  REATTEMPT = "REATTEMPT",
  RETURN_TO_WAREHOUSE = "RETURN_TO_WAREHOUSE",
}

export enum BillingStatus {
  NOT_BILLED = "NOT_BILLED",
  PENDING = "PENDING",
  INVOICED = "INVOICED",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum WarehouseStatus {
  ACTIVE = "ACTIVE",
  MAINTENANCE = "MAINTENANCE",
  INACTIVE = "INACTIVE",
}

export enum ExceptionType {
  LOST = "LOST",
  DAMAGED = "DAMAGED",
  RETURNED_TO_SENDER = "RETURNED_TO_SENDER",
  DELIVERY_FAILED = "DELIVERY_FAILED",
  CUSTOMS_ISSUE = "CUSTOMS_ISSUE",
  WEATHER_DELAY = "WEATHER_DELAY",
}

export enum EventType {
  SHIPMENT_CREATED = "SHIPMENT_CREATED",
  SHIPMENT_UPDATED = "SHIPMENT_UPDATED",
  SHIPMENT_STATUS_CHANGED = "SHIPMENT_STATUS_CHANGED",
  SHIPMENT_PICKED_UP = "SHIPMENT_PICKED_UP",
  SHIPMENT_IN_TRANSIT = "SHIPMENT_IN_TRANSIT",
  SHIPMENT_AT_WAREHOUSE = "SHIPMENT_AT_WAREHOUSE",
  SHIPMENT_OUT_FOR_DELIVERY = "SHIPMENT_OUT_FOR_DELIVERY",
  SHIPMENT_DELIVERED = "SHIPMENT_DELIVERED",
  SHIPMENT_SIGNED = "SHIPMENT_SIGNED",
  SHIPMENT_CANCELLED = "SHIPMENT_CANCELLED",
  SHIPMENT_EXCEPTION_REPORTED = "SHIPMENT_EXCEPTION_REPORTED",
  DELIVERY_ASSIGNED = "DELIVERY_ASSIGNED",
  DELIVERY_STARTED = "DELIVERY_STARTED",
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  DELIVERY_FAILED = "DELIVERY_FAILED",
  BILLING_CHARGED = "BILLING_CHARGED",
  BILLING_INVOICED = "BILLING_INVOICED",
  BILLING_PAID = "BILLING_PAID",
  WAREHOUSE_RECEIVED = "WAREHOUSE_RECEIVED",
  WAREHOUSE_STORED = "WAREHOUSE_STORED",
  WAREHOUSE_DISPATCHED = "WAREHOUSE_DISPATCHED",
  USER_ACTION = "USER_ACTION",
}

export enum UserRole {
  ADMIN = "ADMIN",
  WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER",
  DRIVER = "DRIVER",
  BILLING_OFFICER = "BILLING_OFFICER",
  CUSTOMER_SERVICE = "CUSTOMER_SERVICE",
  CUSTOMER = "CUSTOMER",
}

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export interface Shipment {
  id: string;
  originWarehouseId: string;
  destinationWarehouseId: string;
  status: ShipmentStatus;
  trackingNumber: string;
  customerId: string;
  recipientName: string;
  recipientAddress: string;
  recipientPhone: string;
  weight: number; // kg
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  items: ShipmentItem[];
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  signedAt?: Date;
  cancelledAt?: Date;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  description: string;
  quantity: number;
  weight: number;
  value: number;
  hsCode?: string; // For customs
}

export interface ShipmentStatusEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ShipmentTimeline {
  id: string;
  shipmentId: string;
  eventType: EventType;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ShipmentTracking {
  id: string;
  shipmentId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: "GPS" | "MANUAL" | "CHECKPOINT";
  accuracy?: number;
  speed?: number;
}

export interface ShipmentDelivery {
  id: string;
  shipmentId: string;
  status: DeliveryStatus;
  driverId: string;
  vehicleId: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  recipientSignature?: string;
  deliveryNotes?: string;
  attemptNumber: number;
  maxAttempts: number;
}

export interface ShipmentBilling {
  id: string;
  shipmentId: string;
  status: BillingStatus;
  pickupFee: number;
  transitFee: number;
  storageFee: number;
  deliveryFee: number;
  surcharges: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  invoiceNumber?: string;
  invoicedAt?: Date;
  paidAt?: Date;
}

export interface ShipmentAudit {
  id: string;
  shipmentId: string;
  eventType: EventType;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  action: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata: {
    ipAddress: string;
    userAgent: string;
    location?: string;
  };
  signature?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  status: WarehouseStatus;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number; // cubic meters
  currentLoad: number;
  managerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAssignment {
  id: string;
  shipmentId: string;
  driverId: string;
  vehicleId: string;
  status: DeliveryStatus;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  route: string[];
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
}

export interface BillingRecord {
  id: string;
  shipmentId: string;
  status: BillingStatus;
  charges: BillingCharge[];
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  invoiceNumber?: string;
  invoicedAt?: Date;
  paidAt?: Date;
}

export interface BillingCharge {
  id: string;
  type: "PICKUP" | "TRANSIT" | "STORAGE" | "DELIVERY" | "SURCHARGE" | "CLAIM";
  amount: number;
  description: string;
  appliedAt: Date;
}

// ============================================================================
// WORKFLOW TRANSITION TYPES
// ============================================================================

export interface WorkflowTransition {
  from: ShipmentStatus;
  to: ShipmentStatus;
  requiredFields: string[];
  requiredRole: UserRole[];
  allowedWarehouseStatus: WarehouseStatus[];
  auditEvent: EventType;
  billingTrigger?: BillingCharge;
  notificationEvent?: string;
}

export interface TransitionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredFields: string[];
}

// ============================================================================
// EVENT SOURCING TYPES
// ============================================================================

export interface DomainEvent {
  id: string;
  aggregateId: string; // shipmentId
  aggregateType: "Shipment" | "Delivery" | "Billing";
  eventType: EventType;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  data: Record<string, unknown>;
  metadata: {
    version: number;
    correlationId: string;
    causationId?: string;
  };
}

export interface EventStore {
  id: string;
  events: DomainEvent[];
  version: number;
  lastUpdated: Date;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export interface PendingAction {
  id: string;
  type: EventType;
  shipmentId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  synced: boolean;
  syncedAt?: Date;
  syncError?: string;
  retryCount: number;
}

export interface SyncConflict {
  id: string;
  localVersion: DomainEvent;
  serverVersion: DomainEvent;
  resolution: "LOCAL" | "SERVER" | "MANUAL";
  resolvedAt?: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  eventType: EventType;
  shipmentId: string;
  message: string;
  channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
  sentAt: Date;
  readAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

export const ShipmentCreateSchema = z.object({
  organizationId: z.string().uuid(),
  originWarehouseId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  customerId: z.string().uuid(),
  recipientName: z.string().min(1),
  recipientAddress: z.string().min(1),
  recipientPhone: z.string().min(1),
  weight: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      weight: z.number().positive(),
      value: z.number().nonnegative(),
      hsCode: z.string().optional(),
    })
  ),
});

export const TransitionRequestSchema = z.object({
  shipmentId: z.string().uuid(),
  toStatus: z.nativeEnum(ShipmentStatus),
  userId: z.string().uuid(),
  userRole: z.nativeEnum(UserRole),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const DeliveryAssignmentSchema = z.object({
  shipmentId: z.string().uuid(),
  driverId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  estimatedDeliveryTime: z.date(),
  route: z.array(z.string()),
});

export const BillingChargeSchema = z.object({
  shipmentId: z.string().uuid(),
  type: z.enum(["PICKUP", "TRANSIT", "STORAGE", "DELIVERY", "SURCHARGE", "CLAIM"]),
  amount: z.number().positive(),
  description: z.string().min(1),
});

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface ShipmentQuery {
  shipmentId?: string;
  status?: ShipmentStatus;
  customerId?: string;
  warehouseId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  offset?: number;
}

export interface AuditQuery {
  shipmentId?: string;
  userId?: string;
  eventType?: EventType;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  offset?: number;
}

export interface TrackingQuery {
  shipmentId: string;
  includeLocation?: boolean;
  includeTimeline?: boolean;
  includeDelivery?: boolean;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ShipmentResponse {
  shipment: Shipment;
  status: ShipmentStatus;
  timeline: ShipmentTimeline[];
  tracking: ShipmentTracking[];
  delivery?: ShipmentDelivery;
  billing?: ShipmentBilling;
}

export interface TransitionResponse {
  success: boolean;
  shipmentId: string;
  previousStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
  timestamp: Date;
  auditId: string;
  errors?: string[];
}

export interface AuditResponse {
  total: number;
  records: ShipmentAudit[];
  hasMore: boolean;
}

export type ShipmentCreateInput = z.infer<typeof ShipmentCreateSchema>;
export type TransitionRequest = z.infer<typeof TransitionRequestSchema>;
export type DeliveryAssignmentInput = z.infer<typeof DeliveryAssignmentSchema>;
export type BillingChargeInput = z.infer<typeof BillingChargeSchema>;
