// System permission definitions

export enum PermissionModule {
  USERS = "users",
  ROLES = "roles",
  EXPORT = "export",
  IMPORT = "import",
  WAREHOUSE = "warehouse",
  BILLING = "billing",
  DELIVERY = "delivery",
  CUSTOMERS = "customers",
  HR = "hr",
  PROCUREMENT = "procurement",
  REPORTS = "reports",
  SETTINGS = "settings",
  AUDIT = "audit",
  MASTER_AWB = "master-awb",
  HOUSE_AWB = "house-awb",
  PARCELS = "parcels",
  TRACKING = "tracking",
  CUSTOMS = "customs",
  FLIGHTS = "flights",
  MANIFESTS = "manifests",
  QUOTES = "quotes",
  TCRA = "tcra",
}

export enum PermissionAction {
  VIEW = "view",
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  APPROVE = "approve",
  EXPORT = "export",
}

export interface PermissionDefinition {
  code: string;
  name: string;
  module: PermissionModule;
  description: string;
}

// Helper to generate CRUD permissions for a module
const generateCrudPermissions = (
  module: PermissionModule,
  moduleName: string
): PermissionDefinition[] => [
  {
    code: `${module}.${PermissionAction.VIEW}`,
    name: `View ${moduleName}`,
    module,
    description: `Can view ${moduleName.toLowerCase()}`,
  },
  {
    code: `${module}.${PermissionAction.CREATE}`,
    name: `Create ${moduleName}`,
    module,
    description: `Can create ${moduleName.toLowerCase()}`,
  },
  {
    code: `${module}.${PermissionAction.UPDATE}`,
    name: `Update ${moduleName}`,
    module,
    description: `Can update ${moduleName.toLowerCase()}`,
  },
  {
    code: `${module}.${PermissionAction.DELETE}`,
    name: `Delete ${moduleName}`,
    module,
    description: `Can delete ${moduleName.toLowerCase()}`,
  },
];

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // User Management
  ...generateCrudPermissions(PermissionModule.USERS, "Users"),
  
  // Role Management
  ...generateCrudPermissions(PermissionModule.ROLES, "Roles"),
  
  // Export Operations
  ...generateCrudPermissions(PermissionModule.EXPORT, "Export Shipments"),
  {
    code: "export.approve",
    name: "Approve Export",
    module: PermissionModule.EXPORT,
    description: "Can approve export shipments",
  },
  
  // Import Operations
  ...generateCrudPermissions(PermissionModule.IMPORT, "Import Shipments"),
  {
    code: "import.approve",
    name: "Approve Import",
    module: PermissionModule.IMPORT,
    description: "Can approve import shipments",
  },
  
  // Warehouse
  ...generateCrudPermissions(PermissionModule.WAREHOUSE, "Warehouse"),
  {
    code: "warehouse.receive",
    name: "Receive Cargo",
    module: PermissionModule.WAREHOUSE,
    description: "Can receive cargo in warehouse",
  },
  {
    code: "warehouse.dispatch",
    name: "Dispatch Cargo",
    module: PermissionModule.WAREHOUSE,
    description: "Can dispatch cargo from warehouse",
  },
  
  // Billing
  ...generateCrudPermissions(PermissionModule.BILLING, "Billing"),
  {
    code: "billing.approve",
    name: "Approve Invoices",
    module: PermissionModule.BILLING,
    description: "Can approve invoices",
  },
  {
    code: "billing.payment",
    name: "Record Payment",
    module: PermissionModule.BILLING,
    description: "Can record payments against invoices",
  },
  
  // Delivery
  ...generateCrudPermissions(PermissionModule.DELIVERY, "Delivery"),
  {
    code: "delivery.assign",
    name: "Assign Delivery",
    module: PermissionModule.DELIVERY,
    description: "Can assign deliveries to riders",
  },
  
  // Customers
  ...generateCrudPermissions(PermissionModule.CUSTOMERS, "Customers"),
  
  // HR
  ...generateCrudPermissions(PermissionModule.HR, "HR"),
  {
    code: "hr.attendance",
    name: "Manage Attendance",
    module: PermissionModule.HR,
    description: "Can manage employee attendance",
  },
  
  // Procurement
  ...generateCrudPermissions(PermissionModule.PROCUREMENT, "Procurement"),
  {
    code: "procurement.approve",
    name: "Approve Procurement",
    module: PermissionModule.PROCUREMENT,
    description: "Can approve procurement requests",
  },
  
  // Reports
  {
    code: "reports.view",
    name: "View Reports",
    module: PermissionModule.REPORTS,
    description: "Can view reports",
  },
  {
    code: "reports.export",
    name: "Export Reports",
    module: PermissionModule.REPORTS,
    description: "Can export reports",
  },
  
  // Settings
  ...generateCrudPermissions(PermissionModule.SETTINGS, "Settings"),
  
  // Audit
  {
    code: "audit.view",
    name: "View Audit Logs",
    module: PermissionModule.AUDIT,
    description: "Can view audit logs",
  },

  // Master AWB
  ...generateCrudPermissions(PermissionModule.MASTER_AWB, "Master AWB"),
  {
    code: "master-awb.approve",
    name: "Approve Master AWB",
    module: PermissionModule.MASTER_AWB,
    description: "Can approve master air waybills",
  },

  // House AWB
  ...generateCrudPermissions(PermissionModule.HOUSE_AWB, "House AWB"),

  // Parcels
  ...generateCrudPermissions(PermissionModule.PARCELS, "Parcels"),
  {
    code: "parcels.assign",
    name: "Assign Parcels",
    module: PermissionModule.PARCELS,
    description: "Can assign parcels to deliveries",
  },

  // Tracking
  {
    code: "tracking.view",
    name: "View Tracking",
    module: PermissionModule.TRACKING,
    description: "Can view shipment tracking",
  },
  {
    code: "tracking.update",
    name: "Update Tracking",
    module: PermissionModule.TRACKING,
    description: "Can update shipment tracking events",
  },

  // Customs
  ...generateCrudPermissions(PermissionModule.CUSTOMS, "Customs"),
  {
    code: "customs.clear",
    name: "Clear Customs",
    module: PermissionModule.CUSTOMS,
    description: "Can clear shipments through customs",
  },

  // Flights
  ...generateCrudPermissions(PermissionModule.FLIGHTS, "Flights"),
  {
    code: "flights.schedule",
    name: "Schedule Flights",
    module: PermissionModule.FLIGHTS,
    description: "Can schedule cargo flights",
  },

  // Manifests
  ...generateCrudPermissions(PermissionModule.MANIFESTS, "Manifests"),
  {
    code: "manifests.finalize",
    name: "Finalize Manifests",
    module: PermissionModule.MANIFESTS,
    description: "Can finalize cargo manifests",
  },

  // Quotes
  ...generateCrudPermissions(PermissionModule.QUOTES, "Quotes"),
  {
    code: "quotes.approve",
    name: "Approve Quotes",
    module: PermissionModule.QUOTES,
    description: "Can approve freight quotes",
  },

  // TCRA Integration
  {
    code: "tcra.view",
    name: "View TCRA Monitor",
    module: PermissionModule.TCRA,
    description: "Can view TCRA integration monitoring",
  },
  {
    code: "tcra.retry",
    name: "Retry TCRA Events",
    module: PermissionModule.TCRA,
    description: "Can retry failed TCRA events",
  },
];
