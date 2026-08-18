// SIFEX Demo Data — Natural API Operations via fetch()
// Creates 200 MAWBs + 1000 HAWBs across all workflow stages
import { randomUUID } from "node:crypto";

const BASE = "http://localhost:3000";
const CAN_ID = "680393ef-79f6-475d-b1db-703033d4c41e";
const HKG_ID = "d6d35225-96dc-46fb-b3dc-2a3a0efbad4b";
const DAR_ID = "74603083-cf51-4209-a976-9429fa414461";
const NBO_ID = "a7f10e63-4f26-42d0-8985-869624bc5ba0";
const ET_ID = "e8a5238b-f4cf-4c3b-a602-142b64c9c4f7";
const TK_ID = "a74ca9b5-fc30-442d-a276-184406654df7";
const QR_ID = "33141885-4ac8-4268-afd7-72c620ac7fda";
const EK_ID = "65d962a8-cc6f-47da-8f01-e46bc8cb3816";
const CUSTOMER_IDS = ["a28c970b-86c2-46f3-8ace-0d4426be64c5", "feea73b2-b527-4c4e-9b2f-0563933116d4", "b8777629-bc59-4ac2-8790-c33bbbb13a19"];
const RIDER_ID = "82482eb1-3031-40af-9656-c86e1ad76139";

const AIRLINES = [ET_ID, TK_ID, QR_ID, EK_ID];
const STATIONS = [HKG_ID, DAR_ID, NBO_ID];
const FLIGHTS = ["ET-609", "TK-604", "QR-101", "EK-207", "ET-812", "TK-305", "QR-506", "EK-703"];

const SENDER = [
  ["China Electronics Ltd","China Electronics Ltd","88 Tianhe Rd","+862012345601","Guangzhou"],
  ["Guangzhou Textiles Corp","Guangzhou Textiles Corp","456 Huanshi Rd","+862012345602","Guangzhou"],
  ["Shenzhen Tech Logistics","Shenzhen Tech Logistics","12 Science Park","+862012345603","Shenzhen"],
  ["Beijing Medical Supplies","Beijing Medical Supplies","45 Chang'an Ave","+861012345604","Beijing"],
  ["Shanghai Auto Parts Ltd","Shanghai Auto Parts Ltd","78 Pudong Rd","+862112345605","Shanghai"],
  ["Hong Kong Electronics","Hong Kong Electronics","21 Nathan Rd","+85212345606","Hong Kong"],
  ["Ningbo Home Goods","Ningbo Home Goods","34 Port Rd","+862112345607","Ningbo"],
  ["Foshan Ceramics Ltd","Foshan Ceramics Ltd","56 Indus Park","+862112345608","Foshan"],
  ["Xiamen Seafood Export","Xiamen Seafood Export","90 Harbor St","+862112345609","Xiamen"],
  ["Dongguan Fashion Wear","Dongguan Fashion Wear","23 Garment Rd","+862112345610","Dongguan"],
];
const RECEIVER = [
  ["Tanzania Pharma Ltd","Tanzania Pharma Ltd","Plot 123 Bagamoyo Rd","+255712345601","Dar es Salaam"],
  ["JN Textiles (T) Ltd","JN Textiles (T) Ltd","456 Mkwepu St","+255712345602","Dar es Salaam"],
  ["David Kamau","","789 Kenyatta Rd","+255712345603","Arusha"],
  ["Azam Industries","Azam Industries","321 Nyerere Rd","+255712345604","Dar es Salaam"],
  ["TBL","TBL","567 Mandela Rd","+255712345605","Dar es Salaam"],
  ["Kilimanjaro Motors","Kilimanjaro Motors","890 Moshi Rd","+255712345606","Arusha"],
  ["Tanga Cement Co","Tanga Cement","123 Tanga Port","+255712345607","Tanga"],
  ["Mwanza Fish","Mwanza Fish","456 Lake Rd","+255712345608","Mwanza"],
  ["Zanzibar Spice","Zanzibar Spice","789 Stone Town","+255712345609","Zanzibar"],
  ["Dar Logistics","Dar Logistics","12 Kariakoo","+255712345610","Dar es Salaam"],
];
const DESCRIPTIONS = ["Medical equipment","Textile fabrics","Electronic components","Auto spare parts","Industrial machinery","Consumer electronics","Home appliances","Construction materials","Food products","Cosmetics","Agricultural equipment","Office furniture","Sports equipment","Books","Chemical reagents"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log("\n========== SIFEX DEMO DATA GENERATOR (fetch API) ==========\n");

  // ---- PHASE 1: LOGIN ----
  console.log("--- Phase 1: Login ---");
  let cookies = "";

  // Get CSRF
  const csrfResp = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
  const csrfJson = await csrfResp.json();
  const csrfToken = csrfJson.csrfToken;
  const setCookie = csrfResp.headers.get("set-cookie") || "";
  cookies = setCookie.split(",").map(c => c.split(";")[0]).join("; ");

  // Login
  const loginResp = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
    },
    body: `csrfToken=${csrfToken}&email=admin@sifex.com&password=Sifex@Admin2025!`,
    redirect: "manual",
  });
  const loginSetCookie = loginResp.headers.get("set-cookie") || "";
  const newCookies = loginSetCookie.split(",").map(c => c.split(";")[0]).join("; ");
  if (newCookies) cookies = [cookies, newCookies].filter(Boolean).join("; ");
  console.log("  Login OK");

  // ---- BUILD WORKFLOW STAGE DISTRIBUTION ----
  const stages = [];
  const add = (n, s) => { for (let i = 0; i < n; i++) stages.push(s); };
  add(15, "EXPORT:DRAFT"); add(10, "EXPORT:VALIDATED"); add(10, "EXPORT:HAWB_GENERATED");
  add(5, "EXPORT:MAWB_ASSIGNED"); add(5, "EXPORT:FLIGHT_ASSIGNED"); add(5, "EXPORT:DISPATCHED");
  add(10, "IMPORT:PRE_ARRIVAL"); add(10, "IMPORT:TERMINAL_ARRIVED"); add(10, "IMPORT:RECEIVED");
  add(10, "IMPORT:DOCUMENTS_VERIFIED"); add(10, "IMPORT:CUSTOMS_SUBMITTED"); add(10, "IMPORT:CUSTOMS_CLEARED");
  add(15, "WAREHOUSE:STORED"); add(15, "WAREHOUSE:INVOICE_GENERATED"); add(15, "WAREHOUSE:WAITING_PAYMENT");
  add(15, "DELIVERY:RIDER_ASSIGNED"); add(15, "DELIVERY:DELIVERED"); add(15, "DELIVERY:COMPLETED");
  // Shuffle
  for (let i = stages.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [stages[i], stages[j]] = [stages[j], stages[i]]; }

  const mawbIds = [];

  // Clean existing demo data via direct DB (prisma has no cascade delete on MasterAWB→HouseAWB)
  console.log("  Cleaning existing demo data...");
  // Get all 071- MAWBs and delete them on the API
  for (const page of [1, 2, 3, 4, 5]) {
    const existing = await fetch(`${BASE}/api/master-awbs?limit=100&page=${page}`, { headers: { Cookie: cookies } });
    const existingData = await existing.json();
    const existingMawbs = existingData.data || [];
    for (const m of existingMawbs) {
      if (m.awbNumber?.startsWith("071-") || m.trackingNumber?.startsWith("SIF-")) {
        await fetch(`${BASE}/api/master-awbs/${m.id}`, { method: "DELETE", headers: { Cookie: cookies } }).catch(() => {});
      }
    }
  }
  console.log("  Cleaned demo MAWBs");

  // ---- PHASE 2: CREATE 200 MASTER AWBs ----
  console.log("\n--- Phase 2: Creating 200 Master AWBs ---");
  const runId = Date.now() % 100000;
  for (let i = 0; i < 200; i++) {
    const awbNum = `071-${40000001 + i}`;
    const trk = `SIF-${runId}-${String(i + 1).padStart(4, "0")}`;
    const s = pick(SENDER);
    const r = pick(RECEIVER);
    const d = pick(DESCRIPTIONS);
    const dest = pick(STATIONS);
    const al = pick(AIRLINES);
    const fl = pick(FLIGHTS);
    const pc = rand(10, 200);
    const wt = rand(200, 5000);
    const cv = rand(5000, 100000);
    const vol = rand(10, 800) / 10;
    const pm = i % 2 === 0 ? "PP" : "CC";

    const body = {
      awbNumber: awbNum,
      trackingNumber: trk,
      shipmentType: "CAN_GUANGZHOU",
      paymentMode: pm,
      currency: "USD",
      customsValue: cv,
      originStationId: CAN_ID,
      destinationStationId: dest,
      senderName: s[0], senderCompany: s[1], senderAddress: s[2], senderPhone: s[3], senderCity: s[4], senderCountry: "China",
      receiverName: r[0], receiverCompany: r[1], receiverAddress: r[2], receiverPhone: r[3], receiverCity: r[4], receiverCountry: "Tanzania",
      awbPieces: pc, awbWeight: wt, volume: vol,
      description: d,
      airlineId: al, flightNumber: fl,
    };

    const resp = await fetch(`${BASE}/api/master-awbs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify(body),
    });
    const data = await resp.json();

    if (!data.success) {
      console.log(`  FAIL ${awbNum}: ${data.error || JSON.stringify(data)}`);
    } else {
      const id = data.data.id;
      mawbIds.push(id);
      console.log(`  OK ${i + 1}/200 ${awbNum}`);
    }
  }
  console.log(`  => ${mawbIds.length} MAWBs (${200 - mawbIds.length} failed)`);

  if (mawbIds.length === 0) { console.log("FATAL: no MAWBs created"); process.exit(1); }

  // ---- PHASE 3: CREATE 1000 HOUSE AWBs ----
  console.log("\n--- Phase 3: Creating 1000 House AWBs ---");
  let hawbOk = 0, hawbFail = 0;

  for (let mi = 0; mi < mawbIds.length; mi++) {
    for (let h = 0; h < 5; h++) {
      const hawbNum = `HKG-${runId}-${String(mi + 1).padStart(4, "0")}-${String(h + 1).padStart(3, "0")}`;
      const trk = `SIF-H-${runId}-${String(mi + 1).padStart(4, "0")}-${String(h + 1).padStart(2, "0")}`;
      const body = {
        masterAWBId: mawbIds[mi],
        houseAWBNumber: hawbNum,
        trackingNumber: trk,
        shipperId: pick(CUSTOMER_IDS),
        receiverId: pick(CUSTOMER_IDS),
        shipmentType: "CAN_GUANGZHOU",
        paymentMode: h % 2 === 0 ? "PP" : "CC",
        currency: "USD",
        pieces: rand(1, 50),
        weight: rand(20, 500),
        volume: rand(1, 30),
        chargeableWeight: rand(20, 600),
        freight: rand(200, 5000),
        freightRate: rand(5, 15),
        description: pick(DESCRIPTIONS),
        hsCode: String(rand(10000000, 99999999)),
        originCountry: "China",
        destinationCountry: "Tanzania",
      };
      const resp = await fetch(`${BASE}/api/house-awbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.success) hawbOk++; else hawbFail++;
    }
    if ((mi + 1) % 20 === 0) console.log(`  ${(mi + 1) * 5} HAWBs so far...`);
  }
  console.log(`  => ${hawbOk} HAWBs (${hawbFail} failed)`);

  // ---- PHASE 4: SET WORKFLOW STATUSES ----
  console.log("\n--- Phase 4: Setting workflow statuses ---");
  let pok = 0, pfail = 0;
  for (let mi = 0; mi < mawbIds.length; mi++) {
    const sinfo = stages[mi];
    const mod = sinfo.split(":")[0];
    let st = sinfo.split(":")[1];
    let wfs = mod === "BILLING" || mod === "WAREHOUSE" ? "WAREHOUSE" : mod === "DELIVERY" ? "DELIVERY" : mod;

    if (st === "DRAFT") { pok++; continue; }

    if (st === "PAID") {
      await fetch(`${BASE}/api/master-awbs/${mawbIds[mi]}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ workflowStatus: "WAITING_PAYMENT", workflowStage: "WAREHOUSE" }),
      }).catch(() => {});
    }

    const patchResp = await fetch(`${BASE}/api/master-awbs/${mawbIds[mi]}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ workflowStatus: st, workflowStage: wfs }),
    });
    const data = await patchResp.json();
    if (data.success) { pok++; } else { pfail++; }
  }
  console.log(`  => ${pok} OK (${pfail} failed)`);

  // ---- PHASE 5: BILLING ----
  console.log("\n--- Phase 5: Billing records ---");
  let biok = 0;
  for (let mi = 0; mi < mawbIds.length; mi++) {
    const sinfo = stages[mi];
    const mod = sinfo.split(":")[0];
    if (["WAREHOUSE", "DELIVERY"].includes(mod)) {
      await fetch(`${BASE}/api/master-awbs/${mawbIds[mi]}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ cargoStatus: "RELEASED" }),
      }).then(r => r.json()).then(d => { if (d.success) biok++; }).catch(() => {});
    }
  }
  console.log(`  => ${biok} billing records`);

  // Mark PAID — for each delivery-stage MAWB, pay its billing records
  console.log("\n--- Phase 5b: Mark PAID ---");
  let pak = 0;
  for (let mi = 0; mi < mawbIds.length; mi++) {
    const sinfo = stages[mi];
    const st = sinfo.split(":")[1];
    if (["RIDER_ASSIGNED", "DELIVERED", "COMPLETED"].includes(st)) {
      // Get HAWBs for this MAWB to find billing records
      const hawbsResp = await fetch(`${BASE}/api/house-awbs?masterAWBId=${mawbIds[mi]}&limit=5`, {
        headers: { Cookie: cookies },
      });
      const hawbs = await hawbsResp.json();
      const hawbIds = (hawbs.data || []).map(h => h.id);
      for (const hid of hawbIds) {
        const billResp = await fetch(`${BASE}/api/billing?houseAWBId=${hid}&limit=1`, {
          headers: { Cookie: cookies },
        });
        const bill = await billResp.json();
        const rec = (bill.data || [])[0];
        if (rec && (rec.status === "WAITING_PAYMENT" || rec.status === "INVOICED")) {
          await fetch(`${BASE}/api/billing/${rec.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Cookie: cookies },
            body: JSON.stringify({ status: "PAID" }),
          }).then(() => pak++).catch(() => {});
        }
      }
    }
  }
  console.log(`  => ${pak} marked PAID`);

  // ---- PHASE 6: DELIVERY TASKS ----
  console.log("\n--- Phase 6: Delivery tasks ---");
  let dtok = 0, dtfail = 0;
  for (let mi = 0; mi < mawbIds.length; mi++) {
    const sinfo = stages[mi];
    const mod = sinfo.split(":")[0];
    const st = sinfo.split(":")[1];
    if (mod !== "DELIVERY") continue;

    const hawbsResp = await fetch(`${BASE}/api/house-awbs?masterAWBId=${mawbIds[mi]}&limit=1`, {
      headers: { Cookie: cookies },
    });
    const hawbs = await hawbsResp.json();
    const hawbId = (hawbs.data || [])[0]?.id;
    if (!hawbId) { dtfail++; continue; }

    const createResp = await fetch(`${BASE}/api/delivery-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ masterAWBId: mawbIds[mi], houseAWBId: hawbId, deliveryAddress: "Dar es Salaam" }),
    });
    const task = await createResp.json();
    const taskId = task.data?.id;
    if (!taskId) { dtfail++; continue; }

    const transitions = { RIDER_ASSIGNED: ["ASSIGNED"], DELIVERED: ["ASSIGNED", "STARTED", "DELIVERED"], COMPLETED: ["ASSIGNED", "STARTED", "DELIVERED", "COMPLETED"] };
    const steps = transitions[st] || ["ASSIGNED"];
    for (const step of steps) {
      const patchBody = step === "ASSIGNED" ? { assignedRiderId: RIDER_ID, status: step } : { status: step };
      await fetch(`${BASE}/api/delivery-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify(patchBody),
      }).catch(() => {});
    }
    dtok++;
  }
  console.log(`  => ${dtok} delivery tasks (${dtfail} failed)`);

  // ---- SUMMARY ----
  console.log("\n========== SUMMARY ==========");
  console.log(`  MAWBs:       ${mawbIds.length}`);
  console.log(`  HAWBs:       ${hawbOk}`);
  console.log(`  Transitions: ${pok}`);
  console.log(`  Billings:    ${biok} (PAID: ${pak})`);
  console.log(`  Deliveries:  ${dtok}`);
  console.log(`  Login:       admin@sifex.com / Sifex@Admin2025!`);
  console.log(`  URL:         ${BASE}/workspace`);
  console.log("================================");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
