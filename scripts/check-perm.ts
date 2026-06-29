import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const perm = await prisma.permission.findUnique({ where: { code: "billing.payment" } });
  if (!perm) { console.log("billing.payment permission NOT FOUND in DB"); return; }

  const links = await prisma.rolePermission.findMany({
    where: { permissionId: perm.id },
    include: { role: { select: { code: true, name: true } } },
  });

  console.log("Roles with billing.payment:");
  for (const l of links) {
    console.log("  -", l.role.code, "(", l.role.name, ")");
  }

  await prisma.$disconnect();
}

main();
