import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

const CAN_ID = "680393ef-79f6-475d-b1db-703033d4c41e";
const HKG_ID = "d6d35225-96dc-46fb-b3dc-2a3a0efbad4b";
const DAR_ID = "74603083-cf51-4209-a976-9429fa414461";
const NBO_ID = "a7f10e63-4f26-42d0-8985-869624bc5ba0";
const ET_ID = "e8a5238b-f4cf-4c3b-a602-142b64c9c4f7";
const TK_ID = "a74ca9b5-fc30-442d-a276-184406654df7";
const QR_ID = "33141885-4ac8-4268-afd7-72c620ac7fda";
const EK_ID = "65d962a8-cc6f-47da-8f01-e46bc8cb3816";

const CUSTOMER_IDS = [
  "a28c970b-86c2-46f3-8ace-0d4426be64c5",
  "feea73b2-b527-4c4e-9b2f-0563933116d4",
  "b8777629-bc59-4ac2-8790-c33bbbb13a19",
];

const ADMIN_ID = "3f39df38-3270-4fd1-b4a4-8579c69bbaa4";
const RIDER_ID = "82482eb1-3031-40af-9656-c86e1ad76139";

const senderNames = [
  { name: "China Electronics Ltd", company: "China Electronics Ltd", addr: "88 Tianhe Road", phone: "+862012345601", city: "Guangzhou" },
  { name: "Guangzhou Textiles Corp", company: "Guangzhou Textiles Corp", addr: "456 Huanshi Road", phone: "+862012345602", city: "Guangzhou" },
  { name: "Shenzhen Tech Logistics", company: "Shenzhen Tech Logistics", addr: "12 Science Park", phone: "+862012345603", city: "Shenzhen" },
  { name: "Beijing Medical Supplies", company: "Beijing Medical Supplies", addr: "45 Chang'an Ave", phone: "+861012345604", city: "Beijing" },
  { name: "Shanghai Auto Parts Ltd", company: "Shanghai Auto Parts Ltd", addr: "78 Pudong Road", phone: "+862112345605", city: "Shanghai" },
  { name: "Hong Kong Electronics", company: "Hong Kong Electronics", addr: "21 Nathan Road", phone: "+85212345606", city: "Hong Kong" },
  { name: "Ningbo Home Goods", company: "Ningbo Home Goods", addr: "34 Port Road", phone: "+862112345607", city: "Ningbo" },
  { name: "Foshan Ceramics Ltd", company: "Foshan Ceramics Ltd", addr: "56 Indus Park", phone: "+862112345608", city: "Foshan" },
  { name: "Xiamen Seafood Export", company: "Xiamen Seafood Export", addr: "90 Harbor St", phone: "+862112345609", city: "Xiamen" },
  { name: "Dongguan Fashion Wear", company: "Dongguan Fashion Wear", addr: "23 Garment Road", phone: "+862112345610", city: "Dongguan" },
];

const receiverNames = [
  { name: "Tanzania Pharma Ltd", company: "Tanzania Pharma Ltd", addr: "Plot 123, Bagamoyo Road", phone: "+255712345601", city: "Dar es Salaam" },
  { name: "JN Textiles (T) Ltd", company: "JN Textiles (T) Ltd", addr: "456 Mkwepu Street", phone: "+255712345602", city: "Dar es Salaam" },
  { name: "David Kamau", company: "", addr: "789 Kenyatta Road", phone: "+255712345603", city: "Arusha" },
  { name: "Azam Industries", company: "Azam Industries", addr: "321 Nyerere Road", phone: "+255712345604", city: "Dar es Salaam" },
  { name: "TBL (Tanzania Breweries)", company: "TBL", addr: "567 Mandela Road", phone: "+255712345605", city: "Dar es Salaam" },
  { name: "Kilimanjaro Motors Ltd", company: "Kilimanjaro Motors", addr: "890 Moshi Road", phone: "+255712345606", city: "Arusha" },
  { name: "Tanga Cement Co", company: "Tanga Cement", addr: "123 Tanga Port", phone: "+255712345607", city: "Tanga" },
  { name: "Mwanza Fish Processors", company: "Mwanza Fish", addr: "456 Lake Road", phone: "+255712345608", city: "Mwanza" },
  { name: "Zanzibar Spice Export", company: "Zanzibar Spice", addr: "789 Stone Town", phone: "+255712345609", city: "Zanzibar" },
  { name: "Dar Logistics Hub", company: "Dar Logistics", addr: "12 Kariakoo", phone: "+255712345610", city: "Dar es Salaam" },
];

const descriptions = [
  "Medical equipment and pharmaceutical supplies",
  "Textile fabrics and garments",
  "Electronic components and devices",
  "Automotive spare parts",
  "Industrial machinery parts",
  "Consumer electronics and accessories",
  "Home appliances and fittings",
  "Construction materials and hardware",
  "Packaged food products and beverages",
  "Cosmetics and personal care products",
  "Agricultural equipment and tools",
  "Office furniture and supplies",
  "Sports equipment and gear",
  "Books and educational materials",
  "Chemical reagents and lab supplies",
];

const airlines = [ET_ID, TK_ID, QR_ID, EK_ID];
const stations = [HKG_ID, DAR_ID, NBO_ID];
const flightNumbers = ["ET-609", "TK-604", "QR-101", "EK-207", "ET-812", "TK-305", "QR-506", "EK-703"];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function awbNum(i: number) { return `071-${10000000 + i}`; }
function hawbNum(m: number, h: number) { return `HKG-${String(m).padStart(4, "0")}-${String(h).padStart(3, "0")}`; }

async function main() {
  console.log("=== Starting demo data seed ===\n");

  // Clean up any existing demo data (071- prefix)
  const existingMawb = await prisma.masterAWB.deleteMany({ where: { awbNumber: { startsWith: "071-" } } });
  const existingHawb = await prisma.houseAWB.deleteMany({ where: { houseAWBNumber: { startsWith: "HKG-" } } });
  console.log(`Cleaned up ${existingMawb.count} demo MAWBs, ${existingHawb.count} demo HAWBs\n`);

  const TOTAL_MAWBS = 200;
  const HAWBS_PER_MAWB = 5;
  const TOTAL_HAWBS = TOTAL_MAWBS * HAWBS_PER_MAWB;

  // Distribution across workflow stages
  const stages = {
    // Export
    EXPORT_DRAFT: 15,
    EXPORT_VALIDATED: 10,
    EXPORT_HAWB_GENERATED: 10,
    EXPORT_MAWB_ASSIGNED: 5,
    EXPORT_FLIGHT_ASSIGNED: 5,
    EXPORT_DISPATCHED: 5,
    // Import
    IMPORT_PRE_ARRIVAL: 10,
    IMPORT_TERMINAL_ARRIVED: 10,
    IMPORT_RECEIVED: 10,
    IMPORT_DOCUMENTS_VERIFIED: 10,
    IMPORT_CUSTOMS_SUBMITTED: 10,
    IMPORT_CUSTOMS_CLEARED: 10,
    // Warehouse
    WAREHOUSE_STORED: 15,
    WAREHOUSE_INVOICED: 10,
    // Billing
    BILLING_WAITING: 15,
    BILLING_PAID: 15,
    // Delivery
    DELIVERY_RIDER_ASSIGNED: 15,
    DELIVERY_DELIVERED: 15,
    DELIVERY_COMPLETED: 15,
  };

  const statusSequence: { name: string; status: string; stage: string; module: string }[] = [];
  for (const [key, count] of Object.entries(stages)) {
    for (let i = 0; i < count; i++) {
      statusSequence.push({ name: key, status: key.split("_").slice(1).join("_"), stage: key.split("_")[0], module: key.split("_")[0] });
    }
  }

  // Shuffle to randomize
  for (let i = statusSequence.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [statusSequence[i], statusSequence[j]] = [statusSequence[j], statusSequence[i]];
  }

  console.log(`Creating ${TOTAL_MAWBS} Master AWBs with ${TOTAL_HAWBS} House AWBs...`);

  let batch: any[] = [];
  let hawbBatch: any[] = [];
  let batchStart = 0;

  for (let i = 0; i < TOTAL_MAWBS; i++) {
    const seq = statusSequence[i % statusSequence.length];
    const s = pick(senderNames);
    const r = pick(receiverNames);
    const pieces = rand(10, 200);
    const weight = rand(200, 5000);
    const volume = parseFloat((rand(1, 80) + rand(0, 9) / 10).toFixed(1));
    const chgWeight = Math.max(weight, volume * 167);
    const volWeight = Math.round(volume * 167);
    const customsValue = rand(5000, 100000);

    let workflowStage: string;
    switch (seq.module) {
      case "EXPORT": workflowStage = "EXPORT"; break;
      case "IMPORT": workflowStage = "IMPORT"; break;
      case "WAREHOUSE": workflowStage = "WAREHOUSE"; break;
      case "BILLING": workflowStage = "WAREHOUSE"; break;
      case "DELIVERY": workflowStage = "DELIVERY"; break;
      default: workflowStage = "EXPORT";
    }

    // For billing and delivery, set appropriate stage
    let ws = seq.status;
    let wfStage = workflowStage;

    if (seq.name === "BILLING_WAITING") {
      ws = "WAITING_PAYMENT";
      wfStage = "WAREHOUSE";
    } else if (seq.name === "BILLING_PAID") {
      ws = "PAID";
      wfStage = "DELIVERY";
    } else if (seq.name === "DELIVERY_RIDER_ASSIGNED") {
      ws = "RIDER_ASSIGNED";
      wfStage = "DELIVERY";
    } else if (seq.name === "DELIVERY_DELIVERED") {
      ws = "DELIVERED";
      wfStage = "DELIVERY";
    } else if (seq.name === "DELIVERY_COMPLETED") {
      ws = "COMPLETED";
      wfStage = "DELIVERY";
    } else if (seq.name === "WAREHOUSE_STORED") {
      ws = "STORED";
      wfStage = "WAREHOUSE";
    } else if (seq.name === "WAREHOUSE_INVOICED") {
      ws = "INVOICE_GENERATED";
      wfStage = "WAREHOUSE";
    }

    // For import stages, handle the naming
    if (seq.name.startsWith("IMPORT_")) {
      wfStage = "IMPORT";
      const importStatuses: Record<string, string> = {
        "IMPORT_PRE_ARRIVAL": "PRE_ARRIVAL",
        "IMPORT_TERMINAL_ARRIVED": "TERMINAL_ARRIVED",
        "IMPORT_RECEIVED": "RECEIVED",
        "IMPORT_DOCUMENTS_VERIFIED": "DOCUMENTS_VERIFIED",
        "IMPORT_CUSTOMS_SUBMITTED": "CUSTOMS_SUBMITTED",
        "IMPORT_CUSTOMS_CLEARED": "CUSTOMS_CLEARED",
      };
      ws = importStatuses[seq.name] || "PRE_ARRIVAL";
    }

    // For export stages
    if (seq.name.startsWith("EXPORT_")) {
      wfStage = "EXPORT";
      const exportStatuses: Record<string, string> = {
        "EXPORT_DRAFT": "DRAFT",
        "EXPORT_VALIDATED": "VALIDATED",
        "EXPORT_HAWB_GENERATED": "HAWB_GENERATED",
        "EXPORT_MAWB_ASSIGNED": "MAWB_ASSIGNED",
        "EXPORT_FLIGHT_ASSIGNED": "FLIGHT_ASSIGNED",
        "EXPORT_DISPATCHED": "DISPATCHED",
      };
      ws = exportStatuses[seq.name] || "DRAFT";
    }

    const dest = pick(stations);
    const airline = pick(airlines);
    const flight = pick(flightNumbers);

    batch.push({
      createdById: ADMIN_ID,
      awbNumber: awbNum(i + 1),
      trackingNumber: `SIF-${String(i + 1).padStart(4, "0")}`,
      shipmentType: "CAN_GUANGZHOU",
      paymentMode: i % 2 === 0 ? "PP" : "CC",
      currency: "USD",
      customsValue,
      originStationId: CAN_ID,
      destinationStationId: dest,
      senderName: s.name,
      senderCompany: s.company,
      senderAddress: s.addr,
      senderPhone: s.phone,
      senderCity: s.city,
      senderCountry: "China",
      receiverName: r.name,
      receiverCompany: r.company,
      receiverAddress: r.addr,
      receiverPhone: r.phone,
      receiverCity: r.city,
      receiverCountry: "Tanzania",
      awbPieces: pieces,
      awbWeight: weight,
      volume,
      chargeableWeight: chgWeight,
      volumeWeight: volWeight,
      description: pick(descriptions),
      airlineId: airline,
      flightNumber: flight,
      cargoStatus: "INITIATED",
      workflowStatus: ws,
      workflowStage: wfStage,
      departureTime: new Date(Date.now() - rand(1, 30) * 86400000),
      arrivalTime: new Date(Date.now() + rand(1, 7) * 86400000),
    });

    if (batch.length >= 50 || i === TOTAL_MAWBS - 1) {
      if (batch.length === 0) { batchStart = i; }
      await prisma.masterAWB.createMany({ data: batch });
      console.log(`  Created ${batch.length} MAWBs (${i + 1}/${TOTAL_MAWBS})`);

      // Create HAWBs for these MAWBs
      const createdMawbs = await prisma.masterAWB.findMany({
        where: { awbNumber: { in: batch.map((b: any) => b.awbNumber) } },
        orderBy: { createdAt: "asc" },
        take: batch.length,
      });

      for (let mi = 0; mi < createdMawbs.length; mi++) {
        const mawb = createdMawbs[mi];
        for (let h = 0; h < HAWBS_PER_MAWB; h++) {
          const hPieces = rand(1, Math.max(1, Math.floor(mawb.awbPieces / HAWBS_PER_MAWB)));
          const hWeight = rand(20, Math.max(20, Math.floor(mawb.awbWeight / HAWBS_PER_MAWB)));
          const custShipper = pick(CUSTOMER_IDS);
          const custReceiver = pick(CUSTOMER_IDS);
          const globalMawbIdx = batchStart + mi;
          hawbBatch.push({
            masterAWBId: mawb.id,
            houseAWBNumber: hawbNum(globalMawbIdx + 1, h + 1),
            trackingNumber: `SIF-H-${String(i + 1).padStart(4, "0")}-${String(h + 1).padStart(2, "0")}`,
            shipperId: custShipper,
            receiverId: custReceiver,
            shipmentType: "CAN_GUANGZHOU" as any,
            paymentMode: (h % 2 === 0 ? "PP" : "CC") as any,
            currency: "USD",
            pieces: hPieces,
            weight: hWeight,
            description: pick(descriptions),
            hsCode: String(rand(10000000, 99999999)),
            originCountry: "China",
            destinationCountry: "Tanzania",
            cargoStatus: "INITIATED" as any,
            workflowStatus: "DRAFT",
            workflowStage: "EXPORT" as any,
          });
        }
      }

      await prisma.houseAWB.createMany({ data: hawbBatch });
      console.log(`  Created ${hawbBatch.length} HAWBs`);

      batch = [];
      hawbBatch = [];
    }
  }

  console.log(`\n✓ ${TOTAL_MAWBS} MAWBs created`);
  console.log(`✓ ${TOTAL_HAWBS} HAWBs created`);

  // --- Create BillingRecords for warehouse/invoiced shipments ---
  console.log("\nCreating billing records...");
  const warehouseMawbs = await prisma.masterAWB.findMany({
    where: {
      workflowStage: "WAREHOUSE",
      workflowStatus: { in: ["STORED", "INVOICE_GENERATED"] },
    },
    include: { houseAWBs: { take: 1 } },
  });

  let billingBatch: any[] = [];
  for (const mawb of warehouseMawbs) {
    const hawb = mawb.houseAWBs[0];
    if (!hawb) continue;
    const custId = pick(CUSTOMER_IDS);
    const storageDays = rand(1, 30);
    const amount = mawb.chargeableWeight * rand(2, 8) + storageDays * rand(10, 50);

    billingBatch.push({
      masterAWBId: mawb.id,
      houseAWBId: hawb.id,
      customerId: custId,
      invoiceNumber: `INV-${String(mawb.awbNumber).slice(-6)}`,
      amount,
      currency: "USD",
      status: mawb.workflowStatus === "INVOICE_GENERATED" ? "INVOICED" : "DRAFT",
      description: `Storage charges - ${mawb.awbNumber}`,
      storageDays,
      createdById: ADMIN_ID,
    });
  }
  if (billingBatch.length > 0) {
    await prisma.billingRecord.createMany({ data: billingBatch });
    console.log(`✓ ${billingBatch.length} billing records created`);
  }

  // --- Create billing records for BILLING stage ---
  console.log("\nCreating billing records for billing stage...");
  const billingMawbs = await prisma.masterAWB.findMany({
    where: { workflowStatus: { in: ["WAITING_PAYMENT", "PAID"] } },
    include: { houseAWBs: { take: 1 } },
  });

  let billingBatch2: any[] = [];
  for (const mawb of billingMawbs) {
    const hawb = mawb.houseAWBs[0];
    if (!hawb) continue;
    const custId = pick(CUSTOMER_IDS);
    const amount = mawb.chargeableWeight * rand(3, 10);
    const isPaid = mawb.workflowStatus === "PAID";

    billingBatch2.push({
      masterAWBId: mawb.id,
      houseAWBId: hawb.id,
      customerId: custId,
      invoiceNumber: `INV-${String(mawb.awbNumber).slice(-6)}`,
      amount,
      currency: "USD",
      status: isPaid ? "PAID" : "UNPAID",
      description: `Warehouse & handling - ${mawb.awbNumber}`,
      storageDays: rand(1, 15),
      createdById: ADMIN_ID,
    });
  }
  if (billingBatch2.length > 0) {
    await prisma.billingRecord.createMany({ data: billingBatch2 });
    console.log(`✓ ${billingBatch2.length} billing records created`);
  }

  // --- Create DeliveryAssignments for delivery stage ---
  console.log("\nCreating delivery assignments...");
  const deliveryMawbs = await prisma.masterAWB.findMany({
    where: { workflowStage: "DELIVERY" },
    include: { houseAWBs: { take: 1 } },
  });

  let deliveryBatch: any[] = [];
  for (const mawb of deliveryMawbs) {
    const hawb = mawb.houseAWBs[0];
    if (!hawb) continue;
    const customerId = pick(CUSTOMER_IDS);

    let deliveryStatus: string;
    if (mawb.workflowStatus === "COMPLETED") {
      deliveryStatus = "COMPLETED";
    } else if (mawb.workflowStatus === "DELIVERED") {
      deliveryStatus = "DELIVERED";
    } else {
      deliveryStatus = "RIDER_ASSIGNED";
    }

    deliveryBatch.push({
      masterAWBId: mawb.id,
      houseAWBId: hawb.id,
      riderId: RIDER_ID,
      customerId,
      status: deliveryStatus,
      pickupAddress: "Warehouse - Dar es Salaam",
      deliveryAddress: pick(receiverNames).addr + ", " + pick(receiverNames).city,
      createdById: ADMIN_ID,
      assignedAt: mawb.workflowStatus === "RIDER_ASSIGNED" ? new Date() : null,
      deliveredAt: mawb.workflowStatus === "DELIVERED" || mawb.workflowStatus === "COMPLETED" ? new Date() : null,
    });
  }
  if (deliveryBatch.length > 0) {
    await prisma.deliveryAssignment.createMany({ data: deliveryBatch });
    console.log(`✓ ${deliveryBatch.length} delivery assignments created`);
  }

  // --- Summary ---
  const counts = await prisma.masterAWB.groupBy({
    by: ["workflowStage", "workflowStatus"],
    _count: true,
  });

  console.log("\n=== DATA SUMMARY ===");
  for (const c of counts.sort((a, b) => a.workflowStage.localeCompare(b.workflowStage) || a.workflowStatus.localeCompare(b.workflowStatus))) {
    console.log(`  ${c.workflowStage}/${c.workflowStatus}: ${c._count}`);
  }

  const totalMawbs = await prisma.masterAWB.count();
  const totalHawbs = await prisma.houseAWB.count();
  const totalBilling = await prisma.billingRecord.count();
  const totalDelivery = await prisma.deliveryAssignment.count();
  console.log(`\nTotal Master AWBs: ${totalMawbs}`);
  console.log(`Total House AWBs: ${totalHawbs}`);
  console.log(`Total Billing Records: ${totalBilling}`);
  console.log(`Total Delivery Assignments: ${totalDelivery}`);

  await prisma.$disconnect();
  console.log("\n=== Demo data seed complete ===");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
