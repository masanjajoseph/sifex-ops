// System role definitions

export enum SystemRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CEO = "CEO",
  MANAGING_DIRECTOR = "MANAGING_DIRECTOR",
  OPERATIONS_MANAGER = "OPERATIONS_MANAGER",
  EXPORT_OFFICER = "EXPORT_OFFICER",
  IMPORT_OFFICER = "IMPORT_OFFICER",
  WAREHOUSE_SUPERVISOR = "WAREHOUSE_SUPERVISOR",
  WAREHOUSE_OFFICER = "WAREHOUSE_OFFICER",
  BILLING_OFFICER = "BILLING_OFFICER",
  FINANCE_MANAGER = "FINANCE_MANAGER",
  RIDER = "RIDER",
  HR_MANAGER = "HR_MANAGER",
  PROCUREMENT_OFFICER = "PROCUREMENT_OFFICER",
  IT_OFFICER = "IT_OFFICER",
}

export interface RoleDefinition {
  code: SystemRole;
  name: string;
  description: string;
  isSystem: boolean;
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    code: SystemRole.SUPER_ADMIN,
    name: "Super Administrator",
    description: "Full system access with all permissions",
    isSystem: true,
  },
  {
    code: SystemRole.ADMIN,
    name: "Administrator",
    description: "Administrative access to manage users and settings",
    isSystem: true,
  },
  {
    code: SystemRole.CEO,
    name: "Chief Executive Officer",
    description: "Executive access to all reports and analytics",
    isSystem: true,
  },
  {
    code: SystemRole.MANAGING_DIRECTOR,
    name: "Managing Director",
    description: "Senior management access to operations and reports",
    isSystem: true,
  },
  {
    code: SystemRole.OPERATIONS_MANAGER,
    name: "Operations Manager",
    description: "Manage all operational activities",
    isSystem: true,
  },
  {
    code: SystemRole.EXPORT_OFFICER,
    name: "Export Officer",
    description: "Handle export shipments and documentation",
    isSystem: true,
  },
  {
    code: SystemRole.IMPORT_OFFICER,
    name: "Import Officer",
    description: "Handle import shipments and clearance",
    isSystem: true,
  },
  {
    code: SystemRole.WAREHOUSE_SUPERVISOR,
    name: "Warehouse Supervisor",
    description: "Supervise warehouse operations and staff",
    isSystem: true,
  },
  {
    code: SystemRole.WAREHOUSE_OFFICER,
    name: "Warehouse Officer",
    description: "Handle warehouse receiving and dispatch",
    isSystem: true,
  },
  {
    code: SystemRole.BILLING_OFFICER,
    name: "Billing Officer",
    description: "Generate invoices and manage billing",
    isSystem: true,
  },
  {
    code: SystemRole.FINANCE_MANAGER,
    name: "Finance Manager",
    description: "Manage financial operations and reports",
    isSystem: true,
  },
  {
    code: SystemRole.RIDER,
    name: "Rider",
    description: "Deliver shipments to customers",
    isSystem: true,
  },
  {
    code: SystemRole.HR_MANAGER,
    name: "HR Manager",
    description: "Manage human resources and attendance",
    isSystem: true,
  },
  {
    code: SystemRole.PROCUREMENT_OFFICER,
    name: "Procurement Officer",
    description: "Handle procurement and vendor management",
    isSystem: true,
  },
  {
    code: SystemRole.IT_OFFICER,
    name: "IT Officer",
    description: "Manage system configuration and technical support",
    isSystem: true,
  },
];
