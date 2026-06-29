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
  TCRA = "tcra",
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
  { code: "users.invite", name: "Invite Users", module: PermissionModule.USERS, description: "Can invite users via email" },
  { code: "users.reset_password", name: "Reset User Password", module: PermissionModule.USERS, description: "Can reset user passwords" },
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
  { code: "billing.payment", name: "Record Payment", module: PermissionModule.BILLING, description: "Can record payments against invoices" },
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

  // TCRA Integration
  { code: "tcra.view", name: "View TCRA Monitor", module: PermissionModule.TCRA, description: "Can view TCRA integration monitoring" },
  { code: "tcra.retry", name: "Retry TCRA Events", module: PermissionModule.TCRA, description: "Can retry failed TCRA events" },
];

// ─── Role-permission mappings ───

interface RolePermMap {
  roleCode: string;
  permissionCodes: string[];
}

const ROLE_PERMISSIONS: RolePermMap[] = [
  {
    roleCode: "SUPER_ADMIN",
    permissionCodes: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    roleCode: "ADMIN",
    permissionCodes: [
      ...generateCrud("users", "Users").map((p) => p.code),
      "users.invite", "users.reset_password",
      ...generateCrud("roles", "Roles").map((p) => p.code),
      ...generateCrud("billing", "Billing").map((p) => p.code),
      "billing.approve", "billing.payment",
      ...generateCrud("delivery", "Delivery").map((p) => p.code),
      "delivery.assign",
      ...generateCrud("settings", "Settings").map((p) => p.code),
      "audit.view",
      ...generateCrud("customers", "Customers").map((p) => p.code),
      ...generateCrud("export", "Export Shipments").map((p) => p.code),
      "export.approve",
      ...generateCrud("import", "Import Shipments").map((p) => p.code),
      "import.approve",
      ...generateCrud("warehouse", "Warehouse").map((p) => p.code),
      "warehouse.receive", "warehouse.dispatch",
      ...generateCrud("master-awb", "Master AWB").map((p) => p.code),
      "master-awb.approve",
      ...generateCrud("house-awb", "House AWB").map((p) => p.code),
      ...generateCrud("parcels", "Parcels").map((p) => p.code),
      "parcels.assign",
      "tracking.view", "tracking.update",
      ...generateCrud("customs", "Customs").map((p) => p.code),
      "customs.clear",
      ...generateCrud("flights", "Flights").map((p) => p.code),
      "flights.schedule",
      ...generateCrud("manifests", "Manifests").map((p) => p.code),
      "manifests.finalize",
      ...generateCrud("quotes", "Quotes").map((p) => p.code),
      "quotes.approve",
      ...generateCrud("hr", "HR").map((p) => p.code),
      "hr.attendance",
      ...generateCrud("procurement", "Procurement").map((p) => p.code),
      "procurement.approve",
      "reports.view", "reports.export",
      "tcra.view", "tcra.retry",
    ],
  },
  {
    roleCode: "BILLING_OFFICER",
    permissionCodes: [
      "billing.view", "billing.create", "billing.update", "billing.approve", "billing.payment",
      "customers.view",
      "master-awb.view", "house-awb.view",
      "tracking.view",
      "reports.view",
    ],
  },
  {
    roleCode: "FINANCE_MANAGER",
    permissionCodes: [
      "billing.view", "billing.create", "billing.update", "billing.delete", "billing.approve", "billing.payment",
      "customers.view", "customers.create", "customers.update",
      "master-awb.view", "house-awb.view",
      "tracking.view",
      "reports.view", "reports.export",
      "quotes.view", "quotes.create", "quotes.update", "quotes.approve",
    ],
  },
  {
    roleCode: "EXPORT_OFFICER",
    permissionCodes: [
      "export.view", "export.create", "export.update",
      "master-awb.view", "master-awb.create", "master-awb.update",
      "house-awb.view", "house-awb.create", "house-awb.update",
      "customers.view", "customers.create", "customers.update",
      "parcels.view", "parcels.create",
      "tracking.view", "tracking.update",
      "flights.view",
      "manifests.view", "manifests.create",
    ],
  },
  {
    roleCode: "IMPORT_OFFICER",
    permissionCodes: [
      "import.view", "import.create", "import.update",
      "master-awb.view", "house-awb.view",
      "customs.view", "customs.create", "customs.update", "customs.clear",
      "tracking.view", "tracking.update",
      "warehouse.view",
    ],
  },
  {
    roleCode: "WAREHOUSE_SUPERVISOR",
    permissionCodes: [
      "warehouse.view", "warehouse.create", "warehouse.update", "warehouse.delete",
      "warehouse.receive", "warehouse.dispatch",
      "master-awb.view", "house-awb.view",
      "delivery.view", "delivery.assign",
      "parcels.view", "parcels.update", "parcels.assign",
      "tracking.view", "tracking.update",
    ],
  },
  {
    roleCode: "WAREHOUSE_OFFICER",
    permissionCodes: [
      "warehouse.view", "warehouse.create", "warehouse.update",
      "warehouse.receive", "warehouse.dispatch",
      "master-awb.view", "house-awb.view",
      "parcels.view", "parcels.update",
      "tracking.view",
    ],
  },
  {
    roleCode: "CEO",
    permissionCodes: [
      "reports.view", "reports.export",
      "tracking.view",
      "billing.view",
      "export.view", "import.view",
      "warehouse.view",
      "delivery.view",
      "customers.view",
      "master-awb.view", "house-awb.view",
      "tcra.view",
    ],
  },
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

async function linkPermissions(
  roleId: string,
  permMap: Record<string, string>,
  permissionCodes: string[],
  roleLabel: string,
) {
  log("info", `Linking permissions to ${roleLabel}...`);
  let linked = 0;
  let skipped = 0;

  for (const code of permissionCodes) {
    const permId = permMap[code];
    if (!permId) {
      log("warn", `Permission not found: ${code} — skipping`);
      continue;
    }
    const exists = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId: permId } },
    });
    if (exists) { skipped++; continue; }
    await prisma.rolePermission.create({ data: { roleId, permissionId: permId } });
    linked++;
  }

  log("success", `${linked} linked, ${skipped} already exist for ${roleLabel}`);
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
      status: "ACTIVE",
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

async function seedBranch() {
  log("info", "Seeding branch...");

  const branchId = "11111111-1111-1111-1111-111111111111";
  await prisma.branch.upsert({
    where: { id: branchId },
    update: { name: "Main Branch", code: "MAIN" },
    create: { id: branchId, name: "Main Branch", code: "MAIN" },
  });

  log("success", "Branch seeded");
  return branchId;
}

async function seedStations(branchId: string) {
  log("info", "Seeding stations...");

  const stationDefs = [
    { code: "CAN" as const, name: "Guangzhou", type: "AIRPORT" },
    { code: "HKG" as const, name: "Hong Kong", type: "AIRPORT" },
    { code: "DAR" as const, name: "Dar es Salaam", type: "AIRPORT" },
    { code: "DXB" as const, name: "Dubai", type: "AIRPORT" },
    { code: "NBO" as const, name: "Nairobi", type: "AIRPORT" },
    { code: "SHJ" as const, name: "Sharjah", type: "AIRPORT" },
    { code: "JNB" as const, name: "Johannesburg", type: "AIRPORT" },
    { code: "MCT" as const, name: "Muscat", type: "AIRPORT" },
    { code: "BOM" as const, name: "Mumbai", type: "AIRPORT" },
    { code: "ADD" as const, name: "Addis Ababa", type: "AIRPORT" },
    { code: "ZNZ" as const, name: "Zanzibar", type: "AIRPORT" },
  ];

  for (const s of stationDefs) {
    await prisma.station.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type, branchId },
      create: { code: s.code, name: s.name, type: s.type, branchId },
    });
  }

  log("success", `${stationDefs.length} stations seeded`);
}

async function seedAWBTypes() {
  log("info", "Seeding AWB types...");

  const types = [
    { code: "CAN_GUANGZHOU", name: "CAN - Guangzhou", label: "CAN - Guangzhou", sortOrder: 1 },
    { code: "HKG_HONGKONG", name: "HKG - Hong Kong", label: "HKG - Hong Kong", sortOrder: 2 },
    { code: "DXB_DUBAI", name: "DXB - Dubai", label: "DXB - Dubai", sortOrder: 3 },
    { code: "CAN_EXPRESS", name: "CAN - Express", label: "CAN - Express", sortOrder: 4 },
    { code: "MCO_EXPRESS", name: "MCO - Express", label: "MCO - Express", sortOrder: 5 },
  ];

  for (const t of types) {
    await prisma.aWBType.upsert({
      where: { code: t.code },
      update: { name: t.name, label: t.label, sortOrder: t.sortOrder },
      create: { code: t.code, name: t.name, label: t.label, sortOrder: t.sortOrder },
    });
  }
  log("success", `${types.length} AWB types seeded`);
}

async function seedAirlines() {
  log("info", "Seeding airlines...");

  const airlines = [
    { iata: "ET", icao: "ETH", name: "Ethiopian Airlines", rate: 2.50 },
    { iata: "QR", icao: "QTR", name: "Qatar Airways", rate: 3.20 },
    { iata: "EK", icao: "UAE", name: "Emirates", rate: 3.40 },
    { iata: "TK", icao: "THY", name: "Turkish Airlines", rate: 3.10 },
    { iata: "KQ", icao: "KQA", name: "Kenya Airways", rate: 2.80 },
    { iata: "TC", icao: "ATC", name: "Air Tanzania", rate: 2.20 },
    { iata: "MS", icao: "MSR", name: "Egyptair", rate: 2.60 },
    { iata: "EY", icao: "ETD", name: "Etihad Airways", rate: 3.30 },
    { iata: "KL", icao: "KLM", name: "KLM Royal Dutch Airlines", rate: 3.50 },
  ];

  for (const a of airlines) {
    await prisma.airline.upsert({
      where: { iataCode: a.iata },
      update: { name: a.name, icaoCode: a.icao, standardRate: a.rate },
      create: { iataCode: a.iata, icaoCode: a.icao, name: a.name, standardRate: a.rate },
    });
  }

  log("success", `${airlines.length} airlines seeded`);
}

async function seedCurrencies() {
  log("info", "Seeding currencies...");

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$", sortOrder: 1 },
    { code: "EUR", name: "Euro", symbol: "\u20AC", sortOrder: 2 },
    { code: "GBP", name: "British Pound", symbol: "\u00A3", sortOrder: 3 },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", sortOrder: 4 },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh", sortOrder: 5 },
    { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", sortOrder: 6 },
    { code: "AED", name: "UAE Dirham", symbol: "AED", sortOrder: 7 },
    { code: "ZAR", name: "South African Rand", symbol: "R", sortOrder: 8 },
    { code: "INR", name: "Indian Rupee", symbol: "\u20B9", sortOrder: 9 },
    { code: "ETB", name: "Ethiopian Birr", symbol: "Br", sortOrder: 10 },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, sortOrder: c.sortOrder },
      create: { code: c.code, name: c.name, symbol: c.symbol, sortOrder: c.sortOrder },
    });
  }
  log("success", `${currencies.length} currencies seeded`);
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

  // Link permissions for all roles based on ROLE_PERMISSIONS mapping
  for (const mapping of ROLE_PERMISSIONS) {
    const roleId = roleMap[mapping.roleCode];
    if (!roleId) {
      log("warn", `Role not found: ${mapping.roleCode} — skipping permission linking`);
      continue;
    }
    await linkPermissions(roleId, permMap, mapping.permissionCodes, mapping.roleCode);
  }
  console.log("");

  await ensureSuperUser(saRoleId);

  const branchId = await seedBranch();
  console.log("");

  await seedStations(branchId);
  console.log("");

  await seedAirlines();
  console.log("");

  await seedAWBTypes();
  await seedCurrencies();

  console.log("");
  log("success", "Seed complete");
  console.log("========================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  log("error", `Seed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
