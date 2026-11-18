/**
 * TCRA acceptance test — international incoming Guangzhou (CN) -> Tanzania.
 *
 * Uses the production geography resolver (`lib/tcra/locations.ts`) so the test
 * proves the same mapping the integration uses:
 *   postedBranch      = "Guangzhou"
 *   postedRegion      = "CN"
 *   destinationBranch = exact TISP area_name ("Dar-es-salaam" / "Mjini Magharibi")
 *   destinationRegion = "TZ"
 *
 * Usage (on the app server):
 *   node --experimental-strip-types scripts/tcra-acceptance-test.mjs [--dry-run] [logPath]
 *
 * --dry-run  validates and prints the payload without calling TCRA.
 *
 * Secrets: the private key is never printed; token/headers are redacted.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolveTcraEventGeography } from "../lib/tcra/locations.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const logPath = args.find((a) => !a.startsWith("--")) ?? path.join(root, "tcra-acceptance-run.log");

/* ------------------------------------------------------------------ env */

function readEnv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const env = fs.existsSync(path.join(root, ".env")) ? readEnv(path.join(root, ".env")) : {};
const BASE = (env.TCRA_API_URL || "https://196.32.240.66").replace(/\/$/, "");
const INTEGRATION_ID = env.TCRA_INTEGRATION_ID || "1004";
const TOKEN_ID = env.TCRA_TOKEN_ID;
const KEY_PATH = env.TCRA_KEY_PATH;

if (!dryRun && (!TOKEN_ID || !KEY_PATH)) {
  console.error("Missing TCRA_TOKEN_ID or TCRA_KEY_PATH in .env");
  process.exit(1);
}
const privateKey = !dryRun && KEY_PATH ? fs.readFileSync(KEY_PATH, "utf8") : "";

/* -------------------------------------------------------------- helpers */

const tzFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

function tcraTimestamp(date) {
  const parts = tzFormatter.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function sign(payload) {
  const s = crypto.createSign("RSA-SHA1");
  s.update(payload, "utf8");
  s.end();
  return s.sign(privateKey, "base64");
}

/* ---------------------------------------------------------- test cases */

/**
 * Tracking numbers are advanced from the previous run (…4001–4005) because
 * those shipments were already accepted by TCRA with older geography; reusing
 * them would replay accepted events. Service codes and charges are preserved.
 */
const CASES = [
  { trackingNumber: "SFX2611186001", destination: "DAR Dar es Salaam", serviceCode: "S03", serviceTypeCode: "ST03", fee: 90000, vat: 16200 },
  { trackingNumber: "SFX2611186002", destination: "ZNZ Zanzibar", serviceCode: "S03", serviceTypeCode: "ST03", fee: 75000, vat: 13500 },
  { trackingNumber: "SFX2611186003", destination: "DAR Dar es Salaam", serviceCode: "S02", serviceTypeCode: "ST04", fee: 65000, vat: 11700 },
  { trackingNumber: "SFX2611186004", destination: "ZNZ Zanzibar", serviceCode: "S02", serviceTypeCode: "ST04", fee: 55000, vat: 9900 },
  { trackingNumber: "SFX2611186005", destination: "DAR Dar es Salaam", serviceCode: "S02", serviceTypeCode: "ST04", fee: 12000, vat: 2160 },
];

const ORIGIN = "CAN Guangzhou";

const TISP_NAMES = new Set([
  "Dar-es-salaam", "Mjini Magharibi", "Dodoma", "Arusha", "Mwanza", "Mbeya", "Tanga",
  "Morogoro", "Kigoma", "Pwani", "Njombe", "Geita", "Iringa", "Singida", "Mara",
  "Tabora", "Simiyu", "Kagera", "Lindi", "Ruvuma", "Shinyanga", "Katavi", "Manyara",
  "Rukwa", "Kilimanjaro", "Songwe", "Kaskazini Unguja", "Kusini Unguja",
  "Kaskazini Pemba", "Kusini Pemba",
]);

const base = Date.now();
const eventsList = CASES.map((c, i) => {
  const timestamp = tcraTimestamp(new Date(base + i * 1000));
  const geo = resolveTcraEventGeography({ postedBranch: ORIGIN, destinationBranch: c.destination });
  return {
    msgInfo: {
      timestamp,
      msgId: `${INTEGRATION_ID}-${timestamp}-OT01-${String(i + 1).padStart(6, "0")}`,
      operationCode: "OT01",
      operatorCode: INTEGRATION_ID,
    },
    txnInfo: {
      eventTimestamp: timestamp,
      trackingNumber: c.trackingNumber,
      postedBranch: geo.postedBranch,
      postedRegion: geo.postedRegion,
      destinationBranch: geo.destinationBranch,
      destinationRegion: geo.destinationRegion,
      locality: "international_incoming",
      serviceCode: c.serviceCode,
      serviceTypeCode: c.serviceTypeCode,
      status: "Accepted",
      charges: [
        { chargeType: "fee", currency: "TZS", amount: String(c.fee) },
        { chargeType: "vat", currency: "TZS", amount: String(c.vat) },
      ],
    },
  };
});

const payload = { eventsList };
const body = JSON.stringify(payload);

/* ------------------------------------------------------------ validation */

const problems = [];
const expect = (ok, message) => { if (!ok) problems.push(message); };

try { JSON.parse(body); } catch { problems.push("1. Body is not valid JSON"); }

expect(eventsList.length === 5, `2. Expected exactly 5 events, found ${eventsList.length}`);

eventsList.forEach((e, i) => {
  const n = i + 1;
  expect(!!e.msgInfo && !!e.txnInfo, `3. Event ${n} is missing msgInfo or txnInfo`);
  expect(e.txnInfo.postedBranch === "Guangzhou", `4. Event ${n} postedBranch is "${e.txnInfo.postedBranch}" (must be "Guangzhou")`);
  expect(e.txnInfo.postedRegion === "CN", `5. Event ${n} postedRegion is "${e.txnInfo.postedRegion}" (must be "CN")`);
  expect(e.txnInfo.destinationRegion === "TZ", `6. Event ${n} destinationRegion is "${e.txnInfo.destinationRegion}" (must be "TZ")`);
  expect(TISP_NAMES.has(e.txnInfo.destinationBranch), `7. Event ${n} destinationBranch "${e.txnInfo.destinationBranch}" is not a TISP area_name`);
  expect(e.txnInfo.locality === "international_incoming", `8. Event ${n} locality is "${e.txnInfo.locality}"`);
  const expectedDestination = i === 1 || i === 3 ? "Mjini Magharibi" : "Dar-es-salaam";
  expect(e.txnInfo.destinationBranch === expectedDestination, `7b. Event ${n} destinationBranch "${e.txnInfo.destinationBranch}" (must be "${expectedDestination}")`);
  const c = CASES[i];
  expect(e.txnInfo.serviceCode === c.serviceCode && e.txnInfo.serviceTypeCode === c.serviceTypeCode, `9. Event ${n} service codes changed`);
  const amounts = e.txnInfo.charges.map((x) => x.amount).join(",");
  expect(amounts === `${c.fee},${c.vat}`, `9b. Event ${n} charges changed (${amounts})`);
  expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(e.txnInfo.eventTimestamp), `3b. Event ${n} timestamp format is invalid`);
});

if (problems.length) {
  console.error("VALIDATION FAILED — nothing was sent:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

/* ------------------------------------------------------------------ send */

const log = [];
const out = (line = "") => { log.push(line); console.log(line); };

out("================ TCRA ACCEPTANCE TEST ================");
out(`Endpoint: POST ${BASE}/v1/api/events`);
out(`Integration id: ${INTEGRATION_ID}`);
out("token-id: <redacted>");
out("signature: <redacted>");
out(`Dry run: ${dryRun}`);
out("");
out("--- VALIDATION ---");
out("PASS: 5 events, JSON valid, all required fields present");
out("PASS: every postedBranch = Guangzhou, postedRegion = CN");
out("PASS: every destinationRegion = TZ");
out("PASS: destinationBranch is a TISP area_name (Dar-es-salaam x3, Mjini Magharibi x2)");
out("PASS: every locality = international_incoming");
out("PASS: service codes and charges unchanged");
out("");
out("--- GEOGRAPHY TABLE ---");
for (let i = 0; i < eventsList.length; i++) {
  const t = eventsList[i].txnInfo;
  out(`#${i + 1} ${t.trackingNumber} | ${t.postedBranch} / ${t.postedRegion} -> ${t.destinationBranch} / ${t.destinationRegion} | ${t.locality} | ${t.serviceCode}/${t.serviceTypeCode} | fee ${t.charges[0].amount} vat ${t.charges[1].amount}`);
}
out("");
out("--- BODY (exact bytes signed and sent) ---");
out(body);
out("");

if (dryRun) {
  out("Dry run: request not sent.");
  fs.writeFileSync(logPath, log.join("\n") + "\n", "utf8");
  console.log(`\nLog written to ${logPath}`);
  process.exit(0);
}

const signature = sign(body);
const res = await fetch(`${BASE}/v1/api/events`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "integration-id": INTEGRATION_ID,
    "token-id": TOKEN_ID,
    signature,
  },
  body,
});

const responseBody = await res.text();

out("--- RESPONSE HEADERS (selected) ---");
for (const name of ["content-type", "date", "server", "content-length"]) {
  const value = res.headers.get(name);
  if (value) out(`${name}: ${value}`);
}
out("");
out("--- RESPONSE ---");
out(`HTTP ${res.status} ${res.statusText}`);
out(responseBody);
out("");

let allOk = false;
let parsed;
try {
  parsed = JSON.parse(responseBody);
} catch {
  out("RESULT: FAILED — response is not JSON");
}

if (Array.isArray(parsed)) {
  out("--- PER-EVENT RESULT ---");
  const byId = new Map(parsed.map((r) => [r.msgInfo?.msgId, r]));
  allOk = true;
  for (const e of eventsList) {
    const r = byId.get(e.msgInfo.msgId);
    const code = r?.msgResponse?.code ?? "MISSING";
    const message = r?.msgResponse?.message ?? "";
    if (code !== "RC00") allOk = false;
    out(`${e.msgInfo.msgId} | ${e.txnInfo.trackingNumber} | ${code} | ${message}`);
  }
  out("");
  out(`RESULT: ${allOk ? "ALL 5 EVENTS ACCEPTED (RC00)" : "AT LEAST ONE EVENT WAS NOT RC00"}`);
} else if (parsed) {
  out(`RESULT: FAILED — HTTP ${res.status}; code ${parsed?.code ?? "n/a"} ${parsed?.message ?? ""}`);
}

fs.writeFileSync(logPath, log.join("\n") + "\n", "utf8");
console.log(`\nLog written to ${logPath}`);
process.exit(allOk ? 0 : 2);
