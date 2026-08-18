import {
  WorkflowModule,
  WorkflowDefinition,
  WorkflowTransition,
  QuickAction,
  ExportWorkflowStatus,
  ImportWorkflowStatus,
  WarehouseWorkflowStatus,
  BillingWorkflowStatus,
  DeliveryWorkflowStatus,
} from "./types";

const importSubStatuses = [
  "CUSTOMS_NOT_SUBMITTED",
  "CUSTOMS_SUBMITTED",
  "CUSTOMS_ASSESSED",
  "CUSTOMS_PAID",
  "CUSTOMS_INSPECTION",
  "CUSTOMS_CLEARED",
  "CUSTOMS_HOLD",
] as const;

export type ImportCustomsSubStatus = typeof importSubStatuses[number];

const exportQuickActions: Record<string, QuickAction[]> = {
  [ExportWorkflowStatus.DRAFT]: [
    { id: "edit-shipment", label: "Edit Shipment", action: "EDIT_SHIPMENT", icon: "Edit", variant: "outline", requiresPermission: "export.update" },
    { id: "validate-shipment", label: "Validate Shipment", action: "VALIDATE_SHIPMENT", icon: "CheckCircle", variant: "primary", requiresPermission: "export.approve", requiresConfirmation: true, confirmationMessage: "Validate this shipment?" },
    { id: "upload-documents", label: "Upload Documents", action: "UPLOAD_DOCUMENTS", icon: "Upload", variant: "outline", requiresPermission: "export.update" },
    { id: "assign-customer", label: "Assign Customer", action: "ASSIGN_CUSTOMER", icon: "UserPlus", variant: "outline", requiresPermission: "export.update" },
  ],
  [ExportWorkflowStatus.VALIDATED]: [
    { id: "generate-hawb", label: "Generate HAWB", action: "GENERATE_HAWB", icon: "FileText", variant: "primary", requiresPermission: "house-awb.create" },
    { id: "print-hawb", label: "Print HAWB", action: "PRINT_HAWB", icon: "Printer", variant: "outline", requiresPermission: "master-awb.view" },
    { id: "view-cargo", label: "View Cargo", action: "VIEW_CARGO", icon: "Package", variant: "ghost" },
  ],
  [ExportWorkflowStatus.HAWB_GENERATED]: [
    { id: "start-loading", label: "Start Loading", action: "START_LOADING", icon: "Package", variant: "primary", requiresPermission: "master-awb.update" },
    { id: "assign-mawb", label: "Assign HAWBs", action: "ASSIGN_MAWB", icon: "Link", variant: "outline", requiresPermission: "master-awb.update" },
    { id: "print-label", label: "Print Label", action: "PRINT_LABEL", icon: "Printer", variant: "outline", requiresPermission: "master-awb.view" },
  ],
  [ExportWorkflowStatus.LOADING]: [
    { id: "loading-view", label: "Loading View", action: "LOADING_VIEW", icon: "Package", variant: "primary" },
    { id: "complete-loading", label: "Complete Loading", action: "COMPLETE_LOADING", icon: "CheckCircle", variant: "primary", requiresPermission: "master-awb.update", requiresConfirmation: true, confirmationMessage: "Confirm all HAWBs loaded onto MAWB?" },
  ],
  [ExportWorkflowStatus.LOADED]: [
    { id: "assign-mawb-loaded", label: "Assign to MAWB", action: "ASSIGN_MAWB", icon: "Link", variant: "primary", requiresPermission: "master-awb.update" },
  ],
  [ExportWorkflowStatus.MAWB_ASSIGNED]: [
    { id: "generate-manifest", label: "Generate Manifest", action: "GENERATE_MANIFEST", icon: "FileText", variant: "primary", requiresPermission: "manifests.create" },
    { id: "print-manifest", label: "Print Manifest", action: "PRINT_MANIFEST", icon: "Printer", variant: "outline", requiresPermission: "master-awb.view" },
    { id: "verify-cargo", label: "Verify Cargo", action: "VERIFY_CARGO", icon: "Shield", variant: "outline", requiresPermission: "master-awb.update" },
  ],
  [ExportWorkflowStatus.MANIFEST_CREATED]: [
    { id: "view-manifest", label: "View Manifest", action: "VIEW_MANIFEST", icon: "FileText", variant: "outline" },
    { id: "print-manifest", label: "Print Manifest", action: "PRINT_MANIFEST", icon: "Printer", variant: "outline", requiresPermission: "master-awb.view" },
    { id: "assign-flight", label: "Assign Flight", action: "ASSIGN_FLIGHT", icon: "Plane", variant: "primary", requiresPermission: "flights.schedule" },
    { id: "view-flight", label: "View Flight", action: "VIEW_FLIGHT", icon: "Eye", variant: "ghost" },
  ],
  [ExportWorkflowStatus.FLIGHT_ASSIGNED]: [
    { id: "dispatch-flight", label: "Dispatch Flight", action: "DISPATCH_FLIGHT", icon: "Send", variant: "primary", requiresPermission: "warehouse.dispatch", requiresConfirmation: true, confirmationMessage: "Confirm flight dispatch? This will move the shipment to In Transit." },
  ],
  [ExportWorkflowStatus.IN_TRANSIT]: [
    { id: "track-flight", label: "Track Flight", action: "TRACK_FLIGHT", icon: "MapPin", variant: "outline" },
    { id: "view-timeline", label: "View Timeline", action: "VIEW_TIMELINE", icon: "Clock", variant: "ghost" },
  ],
};

const exportTransitions: WorkflowTransition[] = [
  { from: ExportWorkflowStatus.DRAFT, to: ExportWorkflowStatus.VALIDATED, action: "VALIDATE_SHIPMENT", requiredPermission: "export.approve", auditEvent: "export.shipment_validated", notificationEvent: "EXPORT_SHIPMENT_VALIDATED" },
  { from: ExportWorkflowStatus.VALIDATED, to: ExportWorkflowStatus.HAWB_GENERATED, action: "GENERATE_HAWB", requiredPermission: "house-awb.create", auditEvent: "export.hawb_generated" },
  { from: ExportWorkflowStatus.HAWB_GENERATED, to: ExportWorkflowStatus.LOADING, action: "START_LOADING", requiredPermission: "master-awb.update", auditEvent: "export.loading_started", notificationEvent: "EXPORT_LOADING_STARTED" },
  { from: ExportWorkflowStatus.LOADING, to: ExportWorkflowStatus.LOADED, action: "COMPLETE_LOADING", requiredPermission: "master-awb.update", auditEvent: "export.loaded", hawbToStatus: "LOADED" },
  { from: ExportWorkflowStatus.LOADED, to: ExportWorkflowStatus.MAWB_ASSIGNED, action: "ASSIGN_MAWB", requiredPermission: "master-awb.update", auditEvent: "export.mawb_assigned", hawbToStatus: "READY_FOR_MANIFEST" },
  { from: ExportWorkflowStatus.HAWB_GENERATED, to: ExportWorkflowStatus.MAWB_ASSIGNED, action: "ASSIGN_MAWB", requiredPermission: "master-awb.update", auditEvent: "export.mawb_assigned", hawbToStatus: "READY_FOR_MANIFEST" },
  { from: ExportWorkflowStatus.MAWB_ASSIGNED, to: ExportWorkflowStatus.MANIFEST_CREATED, action: "GENERATE_MANIFEST", requiredPermission: "manifests.create", auditEvent: "export.manifest_created", hawbToStatus: "MANIFESTED" },
  { from: ExportWorkflowStatus.MANIFEST_CREATED, to: ExportWorkflowStatus.FLIGHT_ASSIGNED, action: "ASSIGN_FLIGHT", requiredPermission: "flights.schedule", auditEvent: "export.flight_assigned" },
  { from: ExportWorkflowStatus.FLIGHT_ASSIGNED, to: ExportWorkflowStatus.DISPATCHED, action: "DISPATCH_FLIGHT", requiredPermission: "warehouse.dispatch", auditEvent: "export.flight_dispatched", notificationEvent: "EXPORT_FLIGHT_DISPATCHED", chainTo: ExportWorkflowStatus.IN_TRANSIT },
  { from: ExportWorkflowStatus.DISPATCHED, to: ExportWorkflowStatus.IN_TRANSIT, action: "MARK_IN_TRANSIT", requiredPermission: "warehouse.dispatch", autoTrigger: true, auditEvent: "export.in_transit", notificationEvent: "EXPORT_IN_TRANSIT", notificationTargetModule: WorkflowModule.IMPORT, notificationMessage: "Cargo is in transit. Prepare for arrival." },
];

const importQuickActions: Record<string, QuickAction[]> = {
  [ImportWorkflowStatus.PRE_ARRIVAL]: [
    { id: "receive-manifest", label: "Receive Manifest", action: "RECEIVE_MANIFEST", icon: "FileText", variant: "primary", requiresPermission: "import.update" },
    { id: "view-flight-status", label: "View Flight", action: "VIEW_FLIGHT", icon: "Plane", variant: "ghost" },
    { id: "print-pre-alert", label: "Print Pre-Alert", action: "PRINT_PRE_ALERT", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.TERMINAL_ARRIVED]: [
    { id: "verify-manifest", label: "Verify Manifest", action: "VERIFY_MANIFEST", icon: "FileCheck", variant: "primary", requiresPermission: "import.update" },
    { id: "report-discrepancy", label: "Report Discrepancy", action: "REPORT_DISCREPANCY", icon: "AlertTriangle", variant: "danger", requiresPermission: "import.update" },
  ],
  [ImportWorkflowStatus.MANIFEST_VERIFIED]: [
    { id: "receive-mawb", label: "Receive MAWB", action: "RECEIVE_MAWB", icon: "FileText", variant: "primary", requiresPermission: "import.update" },
    { id: "print-arrival-notice", label: "Print Arrival Notice", action: "PRINT_ARRIVAL_NOTICE", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.MAWB_RECEIVED]: [
    { id: "receive-hawbs", label: "Receive House AWBs", action: "RECEIVE_HAWBS", icon: "Package", variant: "primary", requiresPermission: "warehouse.receive" },
    { id: "assign-inspection-location", label: "Assign Bay", action: "ASSIGN_INSPECTION_LOCATION", icon: "MapPin", variant: "outline" },
  ],
  [ImportWorkflowStatus.RECEIVED]: [
    { id: "verify-documents", label: "Verify Documents", action: "VERIFY_DOCUMENTS", icon: "FileCheck", variant: "outline", requiresPermission: "import.update" },
    { id: "verify-pieces", label: "Verify Pieces", action: "VERIFY_PIECES", icon: "Package", variant: "outline", requiresPermission: "import.update" },
    { id: "report-damage", label: "Report Damage", action: "REPORT_DAMAGE", icon: "AlertTriangle", variant: "danger", requiresPermission: "import.update" },
    { id: "report-missing", label: "Report Missing", action: "REPORT_MISSING", icon: "SearchX", variant: "danger", requiresPermission: "import.update" },
    { id: "print-check-sheet", label: "Print Check Sheet", action: "PRINT_CHECK_SHEET", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.DOCUMENTS_VERIFIED]: [
    { id: "verify-pieces-dv", label: "Verify Pieces", action: "VERIFY_PIECES", icon: "Package", variant: "primary", requiresPermission: "import.update" },
    { id: "report-damage-dv", label: "Report Damage", action: "REPORT_DAMAGE", icon: "AlertTriangle", variant: "danger" },
    { id: "report-missing-dv", label: "Report Missing", action: "REPORT_MISSING", icon: "SearchX", variant: "danger" },
  ],
  [ImportWorkflowStatus.PIECES_VERIFIED]: [
    { id: "verify-weight", label: "Verify Weight", action: "VERIFY_WEIGHT", icon: "Weight", variant: "primary", requiresPermission: "import.update" },
    { id: "report-damage-pv", label: "Report Damage", action: "REPORT_DAMAGE", icon: "AlertTriangle", variant: "danger" },
  ],
  [ImportWorkflowStatus.WEIGHT_VERIFIED]: [
    { id: "complete-inspection", label: "Complete Inspection", action: "COMPLETE_INSPECTION", icon: "CheckCircle", variant: "primary", requiresPermission: "import.update" },
    { id: "submit-customs", label: "Submit Customs", action: "SUBMIT_CUSTOMS", icon: "FileText", variant: "outline", requiresPermission: "customs.broker" },
  ],
  [ImportWorkflowStatus.DAMAGE_INSPECTED]: [
    { id: "submit-customs-di", label: "Submit Customs Declaration", action: "SUBMIT_CUSTOMS", icon: "FileText", variant: "primary", requiresPermission: "customs.broker" },
    { id: "print-inspection-report", label: "Print Report", action: "PRINT_INSPECTION_REPORT", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.CUSTOMS_SUBMITTED]: [
    { id: "record-assessment", label: "Check Assessment", action: "RECORD_ASSESSMENT", icon: "DollarSign", variant: "primary", requiresPermission: "customs.broker" },
  ],
  [ImportWorkflowStatus.CUSTOMS_ASSESSED]: [
    { id: "record-duty-payment", label: "Record Payment", action: "RECORD_DUTY_PAYMENT", icon: "DollarSign", variant: "primary", requiresPermission: "billing.payment", requiresConfirmation: true, confirmationMessage: "Confirm duty/tax payment received?" },
    { id: "print-assessment", label: "Print Assessment", action: "PRINT_ASSESSMENT", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.CUSTOMS_PAID]: [
    { id: "schedule-inspection", label: "Schedule Inspection", action: "SCHEDULE_INSPECTION", icon: "Calendar", variant: "outline", requiresPermission: "customs.broker" },
  ],
  [ImportWorkflowStatus.CUSTOMS_INSPECTION]: [
    { id: "customs-released", label: "Record Release", action: "CUSTOMS_RELEASED", icon: "CheckCircle", variant: "primary", requiresPermission: "customs.broker" },
    { id: "report-hold", label: "Report Hold", action: "REPORT_HOLD", icon: "XCircle", variant: "danger", requiresPermission: "customs.broker" },
  ],
  [ImportWorkflowStatus.CUSTOMS_HOLD]: [
    { id: "resolve-hold", label: "Resolve Hold", action: "RESOLVE_HOLD", icon: "CheckCircle", variant: "primary", requiresPermission: "import.update", requiresConfirmation: true, confirmationMessage: "Confirm customs hold resolved?" },
    { id: "upload-hold-notice", label: "Upload Hold Notice", action: "UPLOAD_HOLD_NOTICE", icon: "Upload", variant: "outline" },
    { id: "notify-consignee", label: "Notify Consignee", action: "NOTIFY_CONSIGNEE", icon: "Send", variant: "outline" },
  ],
  [ImportWorkflowStatus.CUSTOMS_CLEARED]: [
    { id: "receive-into-warehouse-cc", label: "Receive Into Warehouse", action: "RECEIVE_INTO_WAREHOUSE", icon: "Warehouse", variant: "primary", requiresPermission: "warehouse.receive", requiresConfirmation: true, confirmationMessage: "Release to warehouse?" },
    { id: "print-release", label: "Print Release", action: "PRINT_RELEASE", icon: "Printer", variant: "outline" },
  ],
  [ImportWorkflowStatus.WAREHOUSE_RECEIVING]: [],
  [ImportWorkflowStatus.EXCEPTION]: [
    { id: "resolve-exception", label: "Resolve Exception", action: "RESOLVE_EXCEPTION", icon: "CheckCircle", variant: "primary", requiresPermission: "import.manager", requiresConfirmation: true, confirmationMessage: "Resolve this exception and return to workflow?" },
    { id: "view-exception-detail", label: "View Details", action: "VIEW_EXCEPTION", icon: "FileText", variant: "outline" },
  ],
};

const importTransitions: WorkflowTransition[] = [
  // Cross-module from Export
  { from: ExportWorkflowStatus.DISPATCHED, to: ImportWorkflowStatus.PRE_ARRIVAL, action: "MARK_PRE_ARRIVAL", requiredPermission: "system:auto", autoTrigger: true, auditEvent: "import.pre_arrival", notificationEvent: "IMPORT_PRE_ARRIVAL", notificationTargetModule: WorkflowModule.IMPORT, notificationMessage: "Flight dispatched. Prepare for arrival." },
  { from: ExportWorkflowStatus.IN_TRANSIT, to: ImportWorkflowStatus.PRE_ARRIVAL, action: "MARK_PRE_ARRIVAL", requiredPermission: "system:auto", autoTrigger: true, auditEvent: "import.pre_arrival", notificationEvent: "IMPORT_PRE_ARRIVAL" },

  // Arrival flow
  { from: ImportWorkflowStatus.PRE_ARRIVAL, to: ImportWorkflowStatus.TERMINAL_ARRIVED, action: "CONFIRM_ARRIVAL", requiredPermission: "warehouse.receive", auditEvent: "import.arrived", notificationEvent: "IMPORT_ARRIVED" },
  { from: ImportWorkflowStatus.TERMINAL_ARRIVED, to: ImportWorkflowStatus.MANIFEST_VERIFIED, action: "VERIFY_MANIFEST", requiredPermission: "import.update", auditEvent: "import.manifest_verified" },

  // Document flow
  { from: ImportWorkflowStatus.MANIFEST_VERIFIED, to: ImportWorkflowStatus.MAWB_RECEIVED, action: "RECEIVE_MAWB", requiredPermission: "import.update", auditEvent: "import.mawb_received" },
  { from: ImportWorkflowStatus.MAWB_RECEIVED, to: ImportWorkflowStatus.RECEIVED, action: "RECEIVE_HAWBS", requiredPermission: "warehouse.receive", auditEvent: "import.received", notificationEvent: "IMPORT_RECEIVED" },

  // Dual verification paths (docs and pieces can be done in either order)
  { from: ImportWorkflowStatus.RECEIVED, to: ImportWorkflowStatus.DOCUMENTS_VERIFIED, action: "VERIFY_DOCUMENTS", requiredPermission: "import.update", auditEvent: "import.document_verified" },
  { from: ImportWorkflowStatus.RECEIVED, to: ImportWorkflowStatus.PIECES_VERIFIED, action: "VERIFY_PIECES", requiredPermission: "import.update", auditEvent: "import.pieces_verified" },
  { from: ImportWorkflowStatus.DOCUMENTS_VERIFIED, to: ImportWorkflowStatus.PIECES_VERIFIED, action: "VERIFY_PIECES", requiredPermission: "import.update", auditEvent: "import.pieces_verified" },
  { from: ImportWorkflowStatus.PIECES_VERIFIED, to: ImportWorkflowStatus.DOCUMENTS_VERIFIED, action: "VERIFY_DOCUMENTS", requiredPermission: "import.update", auditEvent: "import.document_verified" },

  // Physical inspection
  { from: ImportWorkflowStatus.PIECES_VERIFIED, to: ImportWorkflowStatus.WEIGHT_VERIFIED, action: "VERIFY_WEIGHT", requiredPermission: "import.update", auditEvent: "import.weight_verified" },
  { from: ImportWorkflowStatus.DOCUMENTS_VERIFIED, to: ImportWorkflowStatus.WEIGHT_VERIFIED, action: "VERIFY_WEIGHT", requiredPermission: "import.update", auditEvent: "import.weight_verified" },
  { from: ImportWorkflowStatus.WEIGHT_VERIFIED, to: ImportWorkflowStatus.DAMAGE_INSPECTED, action: "COMPLETE_INSPECTION", requiredPermission: "import.update", auditEvent: "import.damage_inspected" },

  // Customs sub-workflow
  { from: ImportWorkflowStatus.DAMAGE_INSPECTED, to: ImportWorkflowStatus.CUSTOMS_SUBMITTED, action: "SUBMIT_CUSTOMS", requiredPermission: "customs.broker", auditEvent: "import.customs_submitted", notificationEvent: "IMPORT_CUSTOMS_SUBMITTED" },
  { from: ImportWorkflowStatus.CUSTOMS_SUBMITTED, to: ImportWorkflowStatus.CUSTOMS_ASSESSED, action: "RECORD_ASSESSMENT", requiredPermission: "customs.broker", auditEvent: "import.customs_assessed" },
  { from: ImportWorkflowStatus.CUSTOMS_ASSESSED, to: ImportWorkflowStatus.CUSTOMS_PAID, action: "RECORD_DUTY_PAYMENT", requiredPermission: "billing.payment", auditEvent: "import.customs_paid" },
  { from: ImportWorkflowStatus.CUSTOMS_PAID, to: ImportWorkflowStatus.CUSTOMS_INSPECTION, action: "SCHEDULE_INSPECTION", requiredPermission: "customs.broker", auditEvent: "import.customs_inspection" },
  { from: ImportWorkflowStatus.CUSTOMS_INSPECTION, to: ImportWorkflowStatus.CUSTOMS_CLEARED, action: "CUSTOMS_RELEASED", requiredPermission: "customs.broker", auditEvent: "import.customs_released", notificationEvent: "IMPORT_CUSTOMS_CLEARED" },
  { from: ImportWorkflowStatus.CUSTOMS_INSPECTION, to: ImportWorkflowStatus.CUSTOMS_HOLD, action: "REPORT_HOLD", requiredPermission: "customs.broker", auditEvent: "import.customs_hold", notificationEvent: "IMPORT_CUSTOMS_HOLD", notificationTargetModule: WorkflowModule.IMPORT, notificationMessage: "Customs hold placed on shipment. Action required." },
  { from: ImportWorkflowStatus.CUSTOMS_HOLD, to: ImportWorkflowStatus.CUSTOMS_CLEARED, action: "RESOLVE_HOLD", requiredPermission: "import.update", auditEvent: "import.customs_hold_resolved", notificationEvent: "IMPORT_CUSTOMS_CLEARED" },

  // Warehouse handover
  { from: ImportWorkflowStatus.CUSTOMS_CLEARED, to: ImportWorkflowStatus.WAREHOUSE_RECEIVING, action: "RECEIVE_INTO_WAREHOUSE", requiredPermission: "warehouse.receive", auditEvent: "import.warehouse_receiving", notificationEvent: "IMPORT_TO_WAREHOUSE", notificationTargetModule: WorkflowModule.WAREHOUSE, notificationMessage: "Shipment customs-cleared and released to warehouse.", sideEffects: [{ type: "UPDATE_RELATED", target: "workflowStage", data: { stage: "WAREHOUSE" } }] },

  // Exception flow
  { from: ImportWorkflowStatus.RECEIVED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_DAMAGE", requiredPermission: "import.update", auditEvent: "import.damage_reported", notificationEvent: "IMPORT_DAMAGE_REPORTED" },
  { from: ImportWorkflowStatus.RECEIVED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_MISSING", requiredPermission: "import.update", auditEvent: "import.missing_reported", notificationEvent: "IMPORT_MISSING_REPORTED" },
  { from: ImportWorkflowStatus.DOCUMENTS_VERIFIED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_DAMAGE", requiredPermission: "import.update", auditEvent: "import.damage_reported" },
  { from: ImportWorkflowStatus.DOCUMENTS_VERIFIED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_MISSING", requiredPermission: "import.update", auditEvent: "import.missing_reported" },
  { from: ImportWorkflowStatus.PIECES_VERIFIED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_DAMAGE", requiredPermission: "import.update", auditEvent: "import.damage_reported" },
  { from: ImportWorkflowStatus.PIECES_VERIFIED, to: ImportWorkflowStatus.EXCEPTION, action: "REPORT_MISSING", requiredPermission: "import.update", auditEvent: "import.missing_reported" },
  { from: ImportWorkflowStatus.EXCEPTION, to: ImportWorkflowStatus.RECEIVED, action: "RESOLVE_EXCEPTION", requiredPermission: "import.manager", auditEvent: "import.exception_resolved", notificationEvent: "IMPORT_EXCEPTION_RESOLVED" },
  { from: ImportWorkflowStatus.EXCEPTION, to: ImportWorkflowStatus.DOCUMENTS_VERIFIED, action: "RESOLVE_EXCEPTION", requiredPermission: "import.manager", auditEvent: "import.exception_resolved" },
  { from: ImportWorkflowStatus.EXCEPTION, to: ImportWorkflowStatus.PIECES_VERIFIED, action: "RESOLVE_EXCEPTION", requiredPermission: "import.manager", auditEvent: "import.exception_resolved" },
  { from: ImportWorkflowStatus.EXCEPTION, to: ImportWorkflowStatus.WEIGHT_VERIFIED, action: "RESOLVE_EXCEPTION", requiredPermission: "import.manager", auditEvent: "import.exception_resolved" },
  { from: ImportWorkflowStatus.EXCEPTION, to: ImportWorkflowStatus.DAMAGE_INSPECTED, action: "RESOLVE_EXCEPTION", requiredPermission: "import.manager", auditEvent: "import.exception_resolved" },
];

const warehouseQuickActions: Record<string, QuickAction[]> = {
  [WarehouseWorkflowStatus.AWAITING_STORAGE]: [
    { id: "assign-shelf", label: "Assign Shelf", action: "ASSIGN_SHELF", icon: "Layers", variant: "outline", requiresPermission: "warehouse.update" },
    { id: "assign-bin", label: "Assign Bin", action: "ASSIGN_BIN", icon: "Grid3X3", variant: "outline", requiresPermission: "warehouse.update" },
    { id: "print-label", label: "Print Label", action: "PRINT_LABEL", icon: "Printer", variant: "outline", requiresPermission: "warehouse.view" },
  ],
  [WarehouseWorkflowStatus.STORED]: [
    { id: "view-shipment", label: "View Shipment", action: "VIEW_SHIPMENT", icon: "Package", variant: "ghost" },
    { id: "view-customer", label: "View Customer", action: "VIEW_CUSTOMER", icon: "User", variant: "ghost" },
  ],
  [WarehouseWorkflowStatus.INVOICE_GENERATED]: [],
  [WarehouseWorkflowStatus.WAITING_PAYMENT]: [],
};

const warehouseTransitions: WorkflowTransition[] = [
  { from: WarehouseWorkflowStatus.AWAITING_STORAGE, to: WarehouseWorkflowStatus.STORED, action: "ASSIGN_SHELF", requiredPermission: "warehouse.update", auditEvent: "warehouse.stored" },
  { from: ImportWorkflowStatus.WAREHOUSE_RECEIVING, to: WarehouseWorkflowStatus.STORED, action: "ASSIGN_SHELF", requiredPermission: "warehouse.update", auditEvent: "warehouse.stored" },
  { from: WarehouseWorkflowStatus.STORED, to: WarehouseWorkflowStatus.INVOICE_GENERATED, action: "auto_invoice", requiredPermission: "system:auto", autoTrigger: true, auditEvent: "warehouse.invoice_generated", notificationEvent: "WAREHOUSE_INVOICE_GENERATED", notificationTargetModule: WorkflowModule.BILLING, notificationMessage: "Invoice generated. Waiting for payment." },
  { from: WarehouseWorkflowStatus.INVOICE_GENERATED, to: WarehouseWorkflowStatus.WAITING_PAYMENT, action: "auto_waiting_payment", requiredPermission: "system:auto", autoTrigger: true, auditEvent: "warehouse.waiting_payment" },
];

const billingQuickActions: Record<string, QuickAction[]> = {
  [BillingWorkflowStatus.WAITING_PAYMENT]: [
    { id: "receive-payment", label: "Receive Payment", action: "RECEIVE_PAYMENT", icon: "DollarSign", variant: "primary", requiresPermission: "billing.payment", requiresConfirmation: true, confirmationMessage: "Confirm payment received? Shipment will proceed to delivery." },
    { id: "print-invoice", label: "Print Invoice", action: "PRINT_INVOICE", icon: "Printer", variant: "outline", requiresPermission: "billing.view" },
    { id: "email-invoice", label: "Email Invoice", action: "EMAIL_INVOICE", icon: "Mail", variant: "outline", requiresPermission: "billing.view" },
  ],
  [BillingWorkflowStatus.PAID]: [],
};

const billingTransitions: WorkflowTransition[] = [
  { from: BillingWorkflowStatus.WAITING_PAYMENT, to: BillingWorkflowStatus.PAID, action: "RECEIVE_PAYMENT", requiredPermission: "billing.payment", auditEvent: "billing.paid", notificationEvent: "BILLING_PAID", notificationTargetModule: WorkflowModule.DELIVERY, notificationMessage: "Payment received. Shipment ready for delivery dispatch.", sideEffects: [{ type: "UPDATE_RELATED", target: "workflowStage", data: { stage: "DELIVERY" } }] },
];

const deliveryQuickActions: Record<string, QuickAction[]> = {
  [DeliveryWorkflowStatus.WAITING_DELIVERY]: [
    { id: "assign-rider", label: "Assign Rider", action: "ASSIGN_RIDER", icon: "User", variant: "primary", requiresPermission: "delivery.assign" },
    { id: "schedule-delivery", label: "Schedule Delivery", action: "SCHEDULE_DELIVERY", icon: "Calendar", variant: "outline", requiresPermission: "delivery.update" },
    { id: "print-delivery-note", label: "Print Delivery Note", action: "PRINT_DELIVERY_NOTE", icon: "Printer", variant: "outline", requiresPermission: "delivery.view" },
  ],
  [DeliveryWorkflowStatus.RIDER_ASSIGNED]: [
    { id: "start-delivery", label: "Start Delivery", action: "START_DELIVERY", icon: "Play", variant: "primary", requiresPermission: "delivery.update", requiresConfirmation: true, confirmationMessage: "Start this delivery?" },
    { id: "change-rider", label: "Change Rider", action: "CHANGE_RIDER", icon: "UserSwitch", variant: "outline", requiresPermission: "delivery.assign" },
  ],
  [DeliveryWorkflowStatus.OUT_FOR_DELIVERY]: [
    { id: "view-live-tracking", label: "View Live Tracking", action: "VIEW_LIVE_TRACKING", icon: "Map", variant: "outline" },
    { id: "contact-rider", label: "Contact Rider", action: "CONTACT_RIDER", icon: "Phone", variant: "outline" },
    { id: "contact-customer", label: "Contact Customer", action: "CONTACT_CUSTOMER", icon: "MessageSquare", variant: "outline" },
  ],
  [DeliveryWorkflowStatus.DELIVERED]: [
    { id: "view-pod", label: "View POD", action: "VIEW_POD", icon: "FileText", variant: "outline" },
    { id: "print-pod", label: "Print POD", action: "PRINT_POD", icon: "Printer", variant: "outline" },
    { id: "view-signature", label: "View Signature", action: "VIEW_SIGNATURE", icon: "Pen", variant: "outline" },
  ],
  [DeliveryWorkflowStatus.COMPLETED]: [],
  [DeliveryWorkflowStatus.WAITING_ASSIGNMENT]: [
    { id: "assign-rider-task", label: "Assign Rider", action: "ASSIGN_RIDER", icon: "User", variant: "primary", requiresPermission: "delivery.assign" },
    { id: "cancel-task", label: "Cancel Task", action: "CANCEL_TASK", icon: "XCircle", variant: "danger", requiresPermission: "delivery.update", requiresConfirmation: true, confirmationMessage: "Cancel this delivery task?" },
  ],
  [DeliveryWorkflowStatus.ASSIGNED]: [
    { id: "start-delivery-task", label: "Start Delivery", action: "START_DELIVERY", icon: "Play", variant: "primary", requiresPermission: "delivery.update", requiresConfirmation: true, confirmationMessage: "Start this delivery?" },
  ],
  [DeliveryWorkflowStatus.STARTED]: [
    { id: "arrive-destination", label: "Arrive at Destination", action: "ARRIVE_AT_DESTINATION", icon: "MapPin", variant: "outline", requiresPermission: "delivery.update" },
  ],
  [DeliveryWorkflowStatus.ARRIVED]: [
    { id: "confirm-delivery", label: "Confirm Delivery", action: "CONFIRM_DELIVERY", icon: "CheckCircle", variant: "primary", requiresPermission: "delivery.update", requiresConfirmation: true, confirmationMessage: "Confirm delivery completed?" },
  ],
  [DeliveryWorkflowStatus.CANCELLED]: [],
};

const deliveryTransitions: WorkflowTransition[] = [
  { from: DeliveryWorkflowStatus.WAITING_DELIVERY, to: DeliveryWorkflowStatus.RIDER_ASSIGNED, action: "ASSIGN_RIDER", requiredPermission: "delivery.assign", auditEvent: "delivery.rider_assigned" },
  { from: DeliveryWorkflowStatus.RIDER_ASSIGNED, to: DeliveryWorkflowStatus.OUT_FOR_DELIVERY, action: "START_DELIVERY", requiredPermission: "delivery.update", auditEvent: "delivery.out_for_delivery" },
  { from: DeliveryWorkflowStatus.OUT_FOR_DELIVERY, to: DeliveryWorkflowStatus.DELIVERED, action: "COMPLETE_DELIVERY", requiredPermission: "delivery.update", autoTrigger: true, auditEvent: "delivery.delivered", notificationEvent: "DELIVERY_DELIVERED" },
  { from: DeliveryWorkflowStatus.DELIVERED, to: DeliveryWorkflowStatus.COMPLETED, action: "FINALIZE_DELIVERY", requiredPermission: "delivery.update", autoTrigger: true, auditEvent: "delivery.completed", notificationEvent: "DELIVERY_COMPLETED", notificationMessage: "Shipment successfully delivered.", sideEffects: [{ type: "UPDATE_RELATED", target: "workflowStage", data: { stage: "COMPLETED" } }] },
  { from: DeliveryWorkflowStatus.WAITING_ASSIGNMENT, to: DeliveryWorkflowStatus.ASSIGNED, action: "ASSIGN_RIDER", requiredPermission: "delivery.assign", auditEvent: "delivery.rider_assigned" },
  { from: DeliveryWorkflowStatus.ASSIGNED, to: DeliveryWorkflowStatus.STARTED, action: "START_DELIVERY", requiredPermission: "delivery.update", auditEvent: "delivery.started" },
  { from: DeliveryWorkflowStatus.STARTED, to: DeliveryWorkflowStatus.ARRIVED, action: "ARRIVE_AT_DESTINATION", requiredPermission: "delivery.update", autoTrigger: true, auditEvent: "delivery.arrived" },
  { from: DeliveryWorkflowStatus.ARRIVED, to: DeliveryWorkflowStatus.DELIVERED, action: "CONFIRM_DELIVERY", requiredPermission: "delivery.update", auditEvent: "delivery.delivered" },
  { from: DeliveryWorkflowStatus.DELIVERED, to: DeliveryWorkflowStatus.COMPLETED, action: "COMPLETE_TASK", requiredPermission: "delivery.update", autoTrigger: true, auditEvent: "delivery.completed" },
  { from: DeliveryWorkflowStatus.WAITING_ASSIGNMENT, to: DeliveryWorkflowStatus.CANCELLED, action: "CANCEL_TASK", requiredPermission: "delivery.update", auditEvent: "delivery.cancelled" },
];

export const WORKFLOW_DEFINITIONS: Record<WorkflowModule, WorkflowDefinition> = {
  [WorkflowModule.EXPORT]: {
    module: WorkflowModule.EXPORT,
    statuses: Object.values(ExportWorkflowStatus),
    transitions: exportTransitions,
    quickActions: exportQuickActions,
  },
  [WorkflowModule.IMPORT]: {
    module: WorkflowModule.IMPORT,
    statuses: Object.values(ImportWorkflowStatus),
    transitions: importTransitions,
    quickActions: importQuickActions,
  },
  [WorkflowModule.WAREHOUSE]: {
    module: WorkflowModule.WAREHOUSE,
    statuses: Object.values(WarehouseWorkflowStatus),
    transitions: warehouseTransitions,
    quickActions: warehouseQuickActions,
  },
  [WorkflowModule.BILLING]: {
    module: WorkflowModule.BILLING,
    statuses: Object.values(BillingWorkflowStatus),
    transitions: billingTransitions,
    quickActions: billingQuickActions,
  },
  [WorkflowModule.DELIVERY]: {
    module: WorkflowModule.DELIVERY,
    statuses: Object.values(DeliveryWorkflowStatus),
    transitions: deliveryTransitions,
    quickActions: deliveryQuickActions,
  },
};

export const MODULE_STATUS_MAP: Record<string, WorkflowModule> = {
  DRAFT: WorkflowModule.EXPORT,
  VALIDATED: WorkflowModule.EXPORT,
  HAWB_GENERATED: WorkflowModule.EXPORT,
  LOADING: WorkflowModule.EXPORT,
  LOADED: WorkflowModule.EXPORT,
  MAWB_ASSIGNED: WorkflowModule.EXPORT,
  MANIFEST_CREATED: WorkflowModule.EXPORT,
  FLIGHT_ASSIGNED: WorkflowModule.EXPORT,
  DISPATCHED: WorkflowModule.EXPORT,
  READY_FOR_MANIFEST: WorkflowModule.EXPORT,
  MANIFESTED: WorkflowModule.EXPORT,
  IN_TRANSIT: WorkflowModule.IMPORT,
  PRE_ARRIVAL: WorkflowModule.IMPORT,
  TERMINAL_ARRIVED: WorkflowModule.IMPORT,
  MANIFEST_VERIFIED: WorkflowModule.IMPORT,
  MAWB_RECEIVED: WorkflowModule.IMPORT,
  RECEIVED: WorkflowModule.IMPORT,
  DOCUMENTS_VERIFIED: WorkflowModule.IMPORT,
  PIECES_VERIFIED: WorkflowModule.IMPORT,
  WEIGHT_VERIFIED: WorkflowModule.IMPORT,
  DAMAGE_INSPECTED: WorkflowModule.IMPORT,
  CUSTOMS_SUBMITTED: WorkflowModule.IMPORT,
  CUSTOMS_ASSESSED: WorkflowModule.IMPORT,
  CUSTOMS_PAID: WorkflowModule.IMPORT,
  CUSTOMS_INSPECTION: WorkflowModule.IMPORT,
  CUSTOMS_CLEARED: WorkflowModule.IMPORT,
  CUSTOMS_HOLD: WorkflowModule.IMPORT,
  WAREHOUSE_RECEIVING: WorkflowModule.IMPORT,
  EXCEPTION: WorkflowModule.IMPORT,
  AWAITING_STORAGE: WorkflowModule.WAREHOUSE,
  STORED: WorkflowModule.WAREHOUSE,
  INVOICE_GENERATED: WorkflowModule.WAREHOUSE,
  WAITING_PAYMENT: WorkflowModule.BILLING,
  PAID: WorkflowModule.BILLING,
  WAITING_DELIVERY: WorkflowModule.DELIVERY,
  RIDER_ASSIGNED: WorkflowModule.DELIVERY,
  OUT_FOR_DELIVERY: WorkflowModule.DELIVERY,
  DELIVERED: WorkflowModule.DELIVERY,
  COMPLETED: WorkflowModule.DELIVERY,
  WAITING_ASSIGNMENT: WorkflowModule.DELIVERY,
  ASSIGNED: WorkflowModule.DELIVERY,
  STARTED: WorkflowModule.DELIVERY,
  ARRIVED: WorkflowModule.DELIVERY,
  CANCELLED: WorkflowModule.DELIVERY,
};

export function getModuleForStatus(status: string): WorkflowModule | undefined {
  return MODULE_STATUS_MAP[status];
}

export function getQuickActionsForStatus(status: string, permissions: string[]): QuickAction[] {
  const module = getModuleForStatus(status);
  if (!module) return [];
  const definition = WORKFLOW_DEFINITIONS[module];
  const actionsForStatus = definition.quickActions[status];
  if (!actionsForStatus) return [];
  return actionsForStatus.filter(a => !a.requiresPermission || permissions.includes(a.requiresPermission));
}

export function findTransition(from: string, action: string): WorkflowTransition | undefined {
  for (const def of Object.values(WORKFLOW_DEFINITIONS)) {
    const found = def.transitions.find(t => t.from === from && t.action === action);
    if (found) return found;
  }
  return undefined;
}

export function findTransitionByStatuses(from: string, to: string): WorkflowTransition | undefined {
  for (const def of Object.values(WORKFLOW_DEFINITIONS)) {
    const found = def.transitions.find(t => t.from === from && t.to === to);
    if (found) return found;
  }
  return undefined;
}

export function getHawbTargetStatus(action: string): string | undefined {
  const transition = exportTransitions.find(t => t.action === action);
  return transition?.hawbToStatus;
}
