import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

const SALT_ROUNDS = 12;

// ─── Inline role/permission configs (avoid @/ path resolution issues with tsx) ───

enum SystemRole {
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

interface RoleDef {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
}

const SYSTEM_ROLES: RoleDef[] = [
  { code: "SUPER_ADMIN", name: "Super Administrator", description: "Full system access with all permissions", isSystem: true },
  { code: "ADMIN", name: "Administrator", description: "Administrative access to manage users and settings", isSystem: true },
  { code: "CEO", name: "Chief Executive Officer", description: "Executive access to all reports and analytics", isSystem: true },
  { code: "MANAGING_DIRECTOR", name: "Managing Director", description: "Senior management access to operations and reports", isSystem: true },
  { code: "OPERATIONS_MANAGER", name: "Operations Manager", description: "Manage all operational activities", isSystem: true },
  { code: "EXPORT_OFFICER", name: "Export Officer", description: "Handle export shipments and documentation", isSystem: true },
  { code: "IMPORT_OFFICER", name: "Import Officer", description: "Handle import shipments and clearance", isSystem: true },
  { code: "WAREHOUSE_SUPERVISOR", name: "Warehouse Supervisor", description: "Supervise warehouse operations and staff", isSystem: true },
  { code: "WAREHOUSE_OFFICER", name: "Warehouse Officer", description: "Handle warehouse receiving and dispatch", isSystem: true },
  { code: "BILLING_OFFICER", name: "Billing Officer", description: "Generate invoices and manage billing", isSystem: true },
  { code: "FINANCE_MANAGER", name: "Finance Manager", description: "Manage financial operations and reports", isSystem: true },
  { code: "RIDER", name: "Rider", description: "Deliver shipments to customers", isSystem: true },
  { code: "HR_MANAGER", name: "HR Manager", description: "Manage human resources and attendance", isSystem: true },
  { code: "PROCUREMENT_OFFICER", name: "Procurement Officer", description: "Handle procurement and vendor management", isSystem: true },
  { code: "IT_OFFICER", name: "IT Officer", description: "Manage system configuration and technical support", isSystem: true },
];

enum PermissionModule {
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
}

interface PermDef {
  code: string;
  name: string;
  module: string;
  description: string;
}

const generateCrud = (module: string, label: string): PermDef[] => [
  { code: `${module}.view`, name: `View ${label}`, module, description: `Can view ${label.toLowerCase()}` },
  { code: `${module}.create`, name: `Create ${label}`, module, description: `Can create ${label.toLowerCase()}` },
  { code: `${module}.update`, name: `Update ${label}`, module, description: `Can update ${label.toLowerCase()}` },
  { code: `${module}.delete`, name: `Delete ${label}`, module, description: `Can delete ${label.toLowerCase()}` },
];

const SYSTEM_PERMISSIONS: PermDef[] = [
  ...generateCrud("users", "Users"),
  ...generateCrud("roles", "Roles"),
  ...generateCrud("export", "Export Shipments"),
  { code: "export.approve", name: "Approve Export", module: PermissionModule.EXPORT, description: "Can approve export shipments" },
  ...generateCrud("import", "Import Shipments"),
  { code: "import.approve", name: "Approve Import", module: PermissionModule.IMPORT, description: "Can approve import shipments" },
  ...generateCrud("warehouse", "Warehouse"),
  { code: "warehouse.receive", name: "Receive Cargo", module: PermissionModule.WAREHOUSE, description: "Can receive cargo in warehouse" },
  { code: "warehouse.dispatch", name: "Dispatch Cargo", module: PermissionModule.WAREHOUSE, description: "Can dispatch cargo from warehouse" },
  ...generateCrud("billing", "Billing"),
  { code: "billing.approve", name: "Approve Invoices", module: PermissionModule.BILLING, description: "Can approve invoices" },
  ...generateCrud("delivery", "Delivery"),
  { code: "delivery.assign", name: "Assign Delivery", module: PermissionModule.DELIVERY, description: "Can assign deliveries to riders" },
  ...generateCrud("customers", "Customers"),
  ...generateCrud("hr", "HR"),
  { code: "hr.attendance", name: "Manage Attendance", module: PermissionModule.HR, description: "Can manage employee attendance" },
  ...generateCrud("procurement", "Procurement"),
  { code: "procurement.approve", name: "Approve Procurement", module: PermissionModule.PROCUREMENT, description: "Can approve procurement requests" },
  { code: "reports.view", name: "View Reports", module: PermissionModule.REPORTS, description: "Can view reports" },
  { code: "reports.export", name: "Export Reports", module: PermissionModule.REPORTS, description: "Can export reports" },
  ...generateCrud("settings", "Settings"),
  { code: "audit.view", name: "View Audit Logs", module: PermissionModule.AUDIT, description: "Can view audit logs" },

  // Master AWB
  ...generateCrud("master-awb", "Master AWB"),
  { code: "master-awb.approve", name: "Approve Master AWB", module: PermissionModule.MASTER_AWB, description: "Can approve master air waybills" },

  // House AWB
  ...generateCrud("house-awb", "House AWB"),

  // Parcels
  ...generateCrud("parcels", "Parcels"),
  { code: "parcels.assign", name: "Assign Parcels", module: PermissionModule.PARCELS, description: "Can assign parcels to deliveries" },

  // Tracking
  { code: "tracking.view", name: "View Tracking", module: PermissionModule.TRACKING, description: "Can view shipment tracking" },
  { code: "tracking.update", name: "Update Tracking", module: PermissionModule.TRACKING, description: "Can update shipment tracking events" },

  // Customs
  ...generateCrud("customs", "Customs"),
  { code: "customs.clear", name: "Clear Customs", module: PermissionModule.CUSTOMS, description: "Can clear shipments through customs" },

  // Flights
  ...generateCrud("flights", "Flights"),
  { code: "flights.schedule", name: "Schedule Flights", module: PermissionModule.FLIGHTS, description: "Can schedule cargo flights" },

  // Manifests
  ...generateCrud("manifests", "Manifests"),
  { code: "manifests.finalize", name: "Finalize Manifests", module: PermissionModule.MANIFESTS, description: "Can finalize cargo manifests" },

  // Quotes
  ...generateCrud("quotes", "Quotes"),
  { code: "quotes.approve", name: "Approve Quotes", module: PermissionModule.QUOTES, description: "Can approve freight quotes" },
];

// ─── Helpers ───

function log(level: "info" | "warn" | "error" | "success", msg: string, data?: unknown) {
  const ts = new Date().toISOString();
  const p =
    level === "info" ? "[INFO]" :
    level === "warn" ? "[WARN]" :
    level === "error" ? "[ERROR]" : "[OK]";
  console.log(`${ts} ${p} ${msg}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function getEnvOrThrow(name: string): string | undefined {
  const val = process.env[name];
  if (!val) log("warn", `Environment variable ${name} is not set`);
  return val;
}

// ─── Seed phases ───

async function seedRoles(): Promise<Record<string, string>> {
  log("info", "Seeding system roles...");
  const map: Record<string, string> = {};

  for (const def of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: def.code },
      update: { name: def.name, description: def.description },
      create: {
        code: def.code,
        name: def.name,
        description: def.description,
        isSystem: def.isSystem,
      },
    });
    map[def.code] = role.id;
    log("success", `Role: ${def.code}`);
  }

  return map;
}

async function seedPermissions(): Promise<Record<string, string>> {
  log("info", "Seeding permissions...");
  const map: Record<string, string> = {};

  for (const def of SYSTEM_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: def.code },
      update: { name: def.name, module: def.module, description: def.description },
      create: {
        code: def.code,
        name: def.name,
        module: def.module,
        description: def.description,
      },
    });
    map[def.code] = perm.id;
  }

  log("success", `${Object.keys(map).length} permissions seeded`);
  return map;
}

async function linkPermissions(roleId: string, permMap: Record<string, string>) {
  log("info", "Linking all permissions to SUPER_ADMIN...");
  let linked = 0;
  let skipped = 0;

  for (const [code, permId] of Object.entries(permMap)) {
    const exists = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId: permId } },
    });
    if (exists) { skipped++; continue; }
    await prisma.rolePermission.create({ data: { roleId, permissionId: permId } });
    linked++;
  }

  log("success", `${linked} linked, ${skipped} already exist`);
}

async function ensureSuperUser(roleId: string) {
  log("info", "Checking superuser...");

  const name = getEnvOrThrow("SUPERUSER_NAME");
  const email = getEnvOrThrow("SUPERUSER_EMAIL");
  const password = getEnvOrThrow("SUPERUSER_PASSWORD");

  if (!name || !email || !password) {
    log("warn", "SUPERUSER_NAME, SUPERUSER_EMAIL, SUPERUSER_PASSWORD required — skipping");
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    log("error", `Invalid email: ${email}`);
    return null;
  }
  if (password.length < 8) {
    log("error", "Password must be ≥ 8 characters");
    return null;
  }

  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  // Check for existing
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const hasRole = await prisma.userRole.findFirst({ where: { userId: existing.id, roleId } });
    if (!hasRole) {
      await prisma.userRole.create({ data: { userId: existing.id, roleId } });
      log("success", `SUPER_ADMIN role assigned to existing user: ${email}`);
    } else {
      log("info", `Superuser already exists: ${email}`);
    }
    return existing;
  }

  const hashed = await hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      isActive: true,
      emailVerified: new Date(),
      userRoles: { create: { roleId } },
    },
  });

  log("success", `Superuser created: ${email}`);
  log("info", `  Name: ${firstName} ${lastName}`);
  log("info", `  ID:   ${user.id}`);

  // Audit trail
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entity: "User",
      metadata: { event: "SYSTEM_SEED", description: "Superuser auto-created on init" },
    },
  }).catch(() => {});

  return user;
}

// ─── Main ───

async function main() {
  console.log("\n========================================");
  log("info", "Sifex ERP — System Seed");
  log("info", `Started: ${new Date().toISOString()}`);
  console.log("");

  const roleMap = await seedRoles();
  console.log("");

  const permMap = await seedPermissions();
  console.log("");

  const saRoleId = roleMap["SUPER_ADMIN"];
  if (!saRoleId) { log("error", "SUPER_ADMIN role missing"); process.exit(1); }

  await linkPermissions(saRoleId, permMap);
  console.log("");

  await ensureSuperUser(saRoleId);

  console.log("");
  log("success", "Seed complete");
  console.log("========================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  log("error", `Seed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
