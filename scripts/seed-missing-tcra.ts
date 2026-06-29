import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  // Create TCRA permissions if they don't exist
  const perms = [
    { code: "tcra.view", name: "View TCRA Monitor", module: "tcra", description: "Can view TCRA integration monitoring" },
    { code: "tcra.retry", name: "Retry TCRA Events", module: "tcra", description: "Can retry failed TCRA events" },
  ];

  for (const p of perms) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, description: p.description },
      create: { code: p.code, name: p.name, module: p.module, description: p.description },
    });
    console.log(`✓ ${p.code}`);
  }

  // Now assign them to roles that should have them
  const rolePerms = [
    { role: "SUPER_ADMIN", perms: ["tcra.view", "tcra.retry"] },
    { role: "ADMIN", perms: ["tcra.view", "tcra.retry"] },
    { role: "IT_OFFICER", perms: ["tcra.view", "tcra.retry"] },
    { role: "CEO", perms: ["tcra.view"] },
    { role: "MANAGING_DIRECTOR", perms: ["tcra.view"] },
  ];

  // Fetch all permission IDs
  const allPerms = await prisma.permission.findMany();
  const permMap: Record<string, string> = {};
  for (const p of allPerms) {
    permMap[p.code] = p.id;
  }

  // Fetch all role IDs
  const roles = await prisma.role.findMany();
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    roleMap[r.code] = r.id;
  }

  let linked = 0;
  for (const mapping of rolePerms) {
    const roleId = roleMap[mapping.role];
    if (!roleId) {
      console.log(`  ⚠ Role "${mapping.role}" not found`);
      continue;
    }
    for (const code of mapping.perms) {
      const permId = permMap[code];
      if (!permId) {
        console.log(`  ⚠ Permission "${code}" not found`);
        continue;
      }
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
      });
      if (!exists) {
        await prisma.rolePermission.create({ data: { roleId, permissionId: permId } });
        console.log(`  ✓ ${mapping.role} → ${code}`);
        linked++;
      }
    }
  }

  console.log(`\nDone! ${linked} new role-permission links created`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
