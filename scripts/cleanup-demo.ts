import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning demo data...");

const oldBills2 = await prisma.billingRecord.deleteMany({
  where: { houseAWB: { houseAWBNumber: { startsWith: "HKG-" } } },
});
console.log(`  Deleted ${oldBills2.count} billing records linked to demo HAWBs`);

const delTasks = await prisma.deliveryTask.deleteMany({
  where: { taskNumber: { startsWith: "SIF-" } },
});
  console.log(`  Deleted ${delTasks.count} delivery tasks`);

  const oldHawbs = await prisma.houseAWB.deleteMany({
    where: { houseAWBNumber: { startsWith: "HKG-" } },
  });
  console.log(`  Deleted ${oldHawbs.count} House AWBs`);

  const oldMawbs = await prisma.masterAWB.deleteMany({
    where: { awbNumber: { startsWith: "071-" } },
  });
  console.log(`  Deleted ${oldMawbs.count} Master AWBs`);

  console.log("Cleanup complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
