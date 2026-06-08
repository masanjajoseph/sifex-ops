// Centralized system enums and constants

// Shipment Statuses
export enum ExportStatus {
  CARGO_RECEIVED = "CARGO_RECEIVED",
  CARGO_PACKED = "CARGO_PACKED",
  CARGO_MANIFESTED = "CARGO_MANIFESTED",
  CARGO_LOADED = "CARGO_LOADED",
  FLIGHT_DEPARTED = "FLIGHT_DEPARTED",
  ON_TRANSIT = "ON_TRANSIT",
}

export enum ImportStatus {
  ARRIVED = "ARRIVED",
  UNDER_CLEARANCE = "UNDER_CLEARANCE",
  RELEASED = "RELEASED",
}

export enum WarehouseStatus {
  WAREHOUSE_RECEIVED = "WAREHOUSE_RECEIVED",
  BILLING_PENDING = "BILLING_PENDING",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  READY_FOR_DISPATCH = "READY_FOR_DISPATCH",
}

export enum DeliveryStatus {
  ASSIGNED_TO_RIDER = "ASSIGNED_TO_RIDER",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CUSTOMER_PICKUP = "CUSTOMER_PICKUP",
  THIRD_PARTY_PICKUP = "THIRD_PARTY_PICKUP",
}

// Invoice Statuses
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

// Payment Statuses
export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

// Station Types
export enum StationType {
  AIRPORT = "AIRPORT",
  WAREHOUSE = "WAREHOUSE",
  OFFICE = "OFFICE",
}

// Audit Actions
export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  VIEW = "VIEW",
  EXPORT = "EXPORT",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
}

// User Status
export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

// Constants
export const APP_NAME = "Sifex ERP";
export const APP_VERSION = "1.0.0";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const AUDIT_LOG_RETENTION_DAYS = 90;
export const SESSION_TIMEOUT_MINUTES = 480; // 8 hours
export const REFRESH_TOKEN_DAYS = 7;
