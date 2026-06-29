import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  const perms = [
    { code: "tcra.view", name: "View TCRA Monitor", module: "tcra", description: "Can view TCRA integration monitoring" },
    { code: "tcra.retry", name: "Retry TCRA Events", module: "tcra", description: "Can retry failed TCRA events" },
  ];

  for (const p of perms) {
    const exists = await prisma.permission.findUnique({ where: { code: p.code } });
    if (!exists) {
      await prisma.permission.create({ data: p });
      console.log(`Created: ${p.code}`);
    } else {
      console.log(`Already exists: ${p.code}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
