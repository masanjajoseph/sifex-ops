export enum WorkflowModule {
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  WAREHOUSE = "WAREHOUSE",
  BILLING = "BILLING",
  DELIVERY = "DELIVERY",
}

export enum ExportWorkflowStatus {
  DRAFT = "DRAFT",
  VALIDATED = "VALIDATED",
  HAWB_GENERATED = "HAWB_GENERATED",
  LOADING = "LOADING",
  LOADED = "LOADED",
  MAWB_ASSIGNED = "MAWB_ASSIGNED",
  MANIFEST_CREATED = "MANIFEST_CREATED",
  FLIGHT_ASSIGNED = "FLIGHT_ASSIGNED",
  READY_FOR_DISPATCH = "READY_FOR_DISPATCH",
  DISPATCHED = "DISPATCHED",
  IN_TRANSIT = "IN_TRANSIT",
  // HouseAWB-only statuses within the export workflow
  READY_FOR_MANIFEST = "READY_FOR_MANIFEST",
  MANIFESTED = "MANIFESTED",
}

export enum ImportWorkflowStatus {
  PRE_ARRIVAL = "PRE_ARRIVAL",
  TERMINAL_ARRIVED = "TERMINAL_ARRIVED",
  MANIFEST_VERIFIED = "MANIFEST_VERIFIED",
  MAWB_RECEIVED = "MAWB_RECEIVED",
  RECEIVED = "RECEIVED",
  DOCUMENTS_VERIFIED = "DOCUMENTS_VERIFIED",
  PIECES_VERIFIED = "PIECES_VERIFIED",
  WEIGHT_VERIFIED = "WEIGHT_VERIFIED",
  DAMAGE_INSPECTED = "DAMAGE_INSPECTED",
  CUSTOMS_SUBMITTED = "CUSTOMS_SUBMITTED",
  CUSTOMS_ASSESSED = "CUSTOMS_ASSESSED",
  CUSTOMS_PAID = "CUSTOMS_PAID",
  CUSTOMS_INSPECTION = "CUSTOMS_INSPECTION",
  CUSTOMS_CLEARED = "CUSTOMS_CLEARED",
  CUSTOMS_HOLD = "CUSTOMS_HOLD",
  WAREHOUSE_RECEIVING = "WAREHOUSE_RECEIVING",
  EXCEPTION = "EXCEPTION",
}

export enum WarehouseWorkflowStatus {
  AWAITING_STORAGE = "AWAITING_STORAGE",
  STORED = "STORED",
  INVOICE_GENERATED = "INVOICE_GENERATED",
  WAITING_PAYMENT = "WAITING_PAYMENT",
}

export enum BillingWorkflowStatus {
  WAITING_PAYMENT = "WAITING_PAYMENT",
  PAID = "PAID",
}

export enum DeliveryWorkflowStatus {
  WAITING_DELIVERY = "WAITING_DELIVERY",
  RIDER_ASSIGNED = "RIDER_ASSIGNED",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  WAITING_ASSIGNMENT = "WAITING_ASSIGNMENT",
  ASSIGNED = "ASSIGNED",
  STARTED = "STARTED",
  ARRIVED = "ARRIVED",
  CANCELLED = "CANCELLED",
}

export type WorkflowStatus =
  | ExportWorkflowStatus
  | ImportWorkflowStatus
  | WarehouseWorkflowStatus
  | BillingWorkflowStatus
  | DeliveryWorkflowStatus;

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  variant: "primary" | "secondary" | "danger" | "outline" | "ghost";
  requiresPermission?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  endpoint?: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
}

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  action: string;
  requiredPermission: string;
  autoTrigger?: boolean;
  autoTriggerModule?: WorkflowModule;
  auditEvent: string;
  notificationEvent?: string;
  notificationTargetModule?: WorkflowModule;
  notificationMessage?: string;
  sideEffects?: WorkflowSideEffect[];
  /** Separate status for HouseAWBs when they should differ from the MAWB status */
  hawbToStatus?: string;
  /** Double-chain: after reaching `to`, also auto-transition to this status */
  chainTo?: string;
}

export interface WorkflowSideEffect {
  type: "UPDATE_RELATED" | "CREATE_RECORD" | "SEND_NOTIFICATION" | "PUBLISH_EVENT" | "CASCADE_STATUS";
  target?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  module: WorkflowModule;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  quickActions: Record<string, QuickAction[]>;
}

export interface WorkflowContext {
  entityType: "MasterAWB" | "HouseAWB" | "BillingRecord" | "DeliveryAssignment" | "DeliveryTask";
  entityId: string;
  fromStatus: string;
  toStatus: string;
  module: WorkflowModule;
  userId: string;
  departmentId?: string;
  userPermissions?: string[];
  metadata?: Record<string, unknown>;
  /** Override HouseAWB target status (instead of cascading MAWB status to all HAWBs) */
  hawbToStatus?: string;
  /** Specific HouseAWB IDs to update (if omitted and hawbToStatus is set, updates all attached HAWBs) */
  relatedHaWbIds?: string[];
  /** Skip cascading MAWB updates to HouseAWBs entirely */
  skipHouseAWBCascade?: boolean;
  /** Manifest ID for GENERATE_MANIFEST action */
  manifestId?: string;
}

export interface WorkflowResult {
  success: boolean;
  newStatus: string;
  newWorkflowStage?: string;
  auditLogId?: string | null;
  notificationIds?: string[];
  sideEffectResults?: Record<string, unknown>;
}
