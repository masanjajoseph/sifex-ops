import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [], // gets all below
  ADMIN: [
    "users.view", "users.create", "users.update", "users.delete",
    "roles.view", "roles.create", "roles.update", "roles.delete",
    "billing.view", "billing.create", "billing.update", "billing.delete",
    "billing.approve", "billing.payment",
    "delivery.view", "delivery.create", "delivery.update", "delivery.delete",
    "delivery.assign",
    "settings.view", "settings.create", "settings.update", "settings.delete",
    "audit.view",
    "customers.view", "customers.create", "customers.update", "customers.delete",
    "export.view", "export.create", "export.update", "export.delete",
    "export.approve",
    "import.view", "import.create", "import.update", "import.delete",
    "import.approve",
    "warehouse.view", "warehouse.create", "warehouse.update", "warehouse.delete",
    "warehouse.receive", "warehouse.dispatch",
    "master-awb.view", "master-awb.create", "master-awb.update", "master-awb.delete",
    "master-awb.approve",
    "house-awb.view", "house-awb.create", "house-awb.update", "house-awb.delete",
    "parcels.view", "parcels.create", "parcels.update", "parcels.delete",
    "parcels.assign",
    "tracking.view", "tracking.update",
    "customs.view", "customs.create", "customs.update", "customs.delete",
    "customs.clear",
    "flights.view", "flights.create", "flights.update", "flights.delete",
    "flights.schedule",
    "manifests.view", "manifests.create", "manifests.update", "manifests.delete",
    "manifests.finalize",
    "quotes.view", "quotes.create", "quotes.update", "quotes.delete",
    "quotes.approve",
    "hr.view", "hr.create", "hr.update", "hr.delete",
    "hr.attendance",
    "procurement.view", "procurement.create", "procurement.update", "procurement.delete",
    "procurement.approve",
    "reports.view", "reports.export",
    "tcra.view", "tcra.retry",
  ],
  BILLING_OFFICER: [
    "billing.view", "billing.create", "billing.update", "billing.approve", "billing.payment",
    "customers.view",
    "master-awb.view", "house-awb.view",
    "tracking.view",
    "reports.view",
  ],
  FINANCE_MANAGER: [
    "billing.view", "billing.create", "billing.update", "billing.delete", "billing.approve", "billing.payment",
    "customers.view", "customers.create", "customers.update",
    "master-awb.view", "house-awb.view",
    "tracking.view",
    "reports.view", "reports.export",
    "quotes.view", "quotes.create", "quotes.update", "quotes.approve",
  ],
  EXPORT_OFFICER: [
    "export.view", "export.create", "export.update",
    "master-awb.view", "master-awb.create", "master-awb.update",
    "house-awb.view", "house-awb.create", "house-awb.update",
    "customers.view", "customers.create", "customers.update",
    "parcels.view", "parcels.create",
    "tracking.view", "tracking.update",
    "flights.view",
    "manifests.view", "manifests.create",
  ],
  IMPORT_OFFICER: [
    "import.view", "import.create", "import.update",
    "master-awb.view", "house-awb.view",
    "customs.view", "customs.create", "customs.update", "customs.clear",
    "tracking.view", "tracking.update",
    "warehouse.view",
  ],
  WAREHOUSE_SUPERVISOR: [
    "warehouse.view", "warehouse.create", "warehouse.update", "warehouse.delete",
    "warehouse.receive", "warehouse.dispatch",
    "master-awb.view", "house-awb.view",
    "delivery.view", "delivery.assign",
    "parcels.view", "parcels.update", "parcels.assign",
    "tracking.view", "tracking.update",
  ],
  WAREHOUSE_OFFICER: [
    "warehouse.view", "warehouse.create", "warehouse.update",
    "warehouse.receive", "warehouse.dispatch",
    "master-awb.view", "house-awb.view",
    "parcels.view", "parcels.update",
    "tracking.view",
  ],
  CEO: [
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
  MANAGING_DIRECTOR: [
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
  OPERATIONS_MANAGER: [
    "export.view", "export.create", "export.update", "export.approve",
    "import.view", "import.create", "import.update", "import.approve",
    "warehouse.view", "warehouse.receive", "warehouse.dispatch",
    "master-awb.view", "master-awb.create", "master-awb.update",
    "house-awb.view", "house-awb.create", "house-awb.update",
    "parcels.view", "parcels.assign",
    "tracking.view", "tracking.update",
    "customs.view", "customs.clear",
    "flights.view", "flights.schedule",
    "manifests.view", "manifests.finalize",
    "delivery.view", "delivery.assign",
    "reports.view",
  ],
  RIDER: [
    "delivery.view",
    "tracking.view",
  ],
  HR_MANAGER: [
    "hr.view", "hr.create", "hr.update", "hr.delete",
    "hr.attendance",
    "reports.view",
  ],
  PROCUREMENT_OFFICER: [
    "procurement.view", "procurement.create", "procurement.update",
    "procurement.approve",
    "reports.view",
  ],
  IT_OFFICER: [
    "settings.view", "settings.create", "settings.update",
    "users.view", "users.create", "users.update",
    "audit.view",
    "tcra.view", "tcra.retry",
    "reports.view",
  ],
};

async function main() {
  console.log("Fixing role permissions...\n");

  // Get all permission codes → IDs
  const allPermissions = await prisma.permission.findMany();
  const permMap: Record<string, string> = {};
  for (const p of allPermissions) {
    permMap[p.code] = p.id;
  }
  console.log(`Found ${allPermissions.length} permissions in DB\n`);

  // For SUPER_ADMIN, assign ALL permissions
  ROLE_PERMISSIONS["SUPER_ADMIN"] = allPermissions.map((p) => p.code);

  // Get all roles
  const roles = await prisma.role.findMany();
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    roleMap[r.code] = r.id;
  }
  console.log(`Found ${roles.length} roles in DB\n`);

  let totalLinked = 0;
  let totalSkipped = 0;

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleCode];
    if (!roleId) {
      console.log(`  ⚠ Role "${roleCode}" not found in DB, skipping`);
      continue;
    }

    let linked = 0;
    let skipped = 0;

    for (const code of permCodes) {
      const permId = permMap[code];
      if (!permId) {
        console.log(`    ⚠ Permission "${code}" not found in DB, skipping`);
        continue;
      }
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
      });
      if (exists) { skipped++; continue; }
      await prisma.rolePermission.create({ data: { roleId, permissionId: permId } });
      linked++;
    }

    console.log(`  ${roleCode}: ${linked} linked, ${skipped} already exist`);
    totalLinked += linked;
    totalSkipped += skipped;
  }

  console.log(`\nDone! Total: ${totalLinked} linked, ${totalSkipped} skipped`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
