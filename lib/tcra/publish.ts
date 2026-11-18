import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";
import { triggerTcraEvent } from "./events";
import type { TcraCharge } from "./types";

/**
 * Cargo statuses that map to a TCRA operation:
 *   ACCEPTED  -> OT01 (acceptance)
 *   RCS       -> OT02 (dispatch)
 *   DELIVERED -> OT04 (delivery)
 */
const TCRA_CARGO_STATUSES = new Set<string>([
  CargoStatus.ACCEPTED,
  CargoStatus.RCS,
  CargoStatus.DELIVERED,
]);

// TCRA service codes are not part of the SIFEX data model yet. Defaults are
// the courier service used in the accepted acceptance test.
const DEFAULT_SERVICE_CODE = "S03";
const DEFAULT_SERVICE_TYPE_CODE = "ST03";

/** The gateway rejects an empty `charges` array with RC02, so a zero charge is used. */
const EMPTY_CHARGES: TcraCharge[] = [
  { chargeType: "fee", currency: "TZS", amount: "0" },
  { chargeType: "vat", currency: "TZS", amount: "0" },
];

function stationLabel(station: { code: string; name: string } | null | undefined): string | undefined {
  if (!station) return undefined;
  return `${station.code} ${station.name}`.trim();
}

function buildCharges(
  record: { billingCharges: { type: string; amount: number; currency: string }[] } | undefined,
): TcraCharge[] {
  if (!record) return EMPTY_CHARGES;

  const charges = record.billingCharges
    .filter((c) => c.currency?.toUpperCase() === "TZS" && Number.isFinite(c.amount))
    .map<TcraCharge>((c) => ({
      chargeType: /vat|tax/i.test(c.type) ? "vat" : "fee",
      currency: "TZS",
      amount: String(Math.round(c.amount)),
    }));

  return charges.length > 0 ? charges : EMPTY_CHARGES;
}

/**
 * The same cargo status can be re-applied by several workflow transitions
 * (for example RCS via ASSIGNED, HAWB_GENERATED, MAWB_ASSIGNED, ...). Publish
 * each status once per house AWB; failed rows are ignored so a retry is allowed.
 */
async function alreadyPublished(houseAWBId: string, status: string): Promise<boolean> {
  const rows = await prisma.tcraOutbox.findMany({
    where: { houseAWBId, status: { in: ["PENDING", "SENT"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { payload: true },
  });

  return rows.some((row) => {
    const payload = row.payload as { eventsList?: { txnInfo?: { status?: string } }[] } | null;
    return payload?.eventsList?.[0]?.txnInfo?.status === status;
  });
}

/**
 * Queues TCRA events for house AWBs whose cargo status maps to a TCRA
 * operation. Called by the workflow engine after a transition is committed.
 * Never throws into the caller — TCRA reporting must not block operations.
 */
export async function publishTcraEventsForHouseAWBs(houseAWBIds: string[]): Promise<number> {
  if (houseAWBIds.length === 0) return 0;

  const hawbs = await prisma.houseAWB.findMany({
    where: { id: { in: houseAWBIds }, deletedAt: null },
    select: {
      id: true,
      trackingNumber: true,
      cargoStatus: true,
      masterAWB: {
        select: {
          originStation: { select: { code: true, name: true } },
          destinationStation: { select: { code: true, name: true } },
        },
      },
      billingRecords: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { billingCharges: { select: { type: true, amount: true, currency: true } } },
      },
    },
  });

  let published = 0;

  for (const hawb of hawbs) {
    const cargoStatus = hawb.cargoStatus as string;
    if (!TCRA_CARGO_STATUSES.has(cargoStatus)) continue;

    const origin = stationLabel(hawb.masterAWB?.originStation);
    const destination = stationLabel(hawb.masterAWB?.destinationStation);
    // Without a consolidated MAWB there is no route to report yet.
    if (!origin || !destination) continue;

    try {
      if (await alreadyPublished(hawb.id, cargoStatus)) continue;

      const extra = {
        postedBranch: origin,
        destinationBranch: destination,
        serviceCode: DEFAULT_SERVICE_CODE,
        serviceTypeCode: DEFAULT_SERVICE_TYPE_CODE,
        charges: buildCharges(hawb.billingRecords[0]),
      };

      // House AWBs are created before they are consolidated, so the first TCRA
      // event they can carry is the assignment (RCS). Report the acceptance
      // (OT01) first, once, so the gateway sees a complete lifecycle.
      if (cargoStatus === CargoStatus.RCS && !(await alreadyPublished(hawb.id, CargoStatus.ACCEPTED))) {
        triggerTcraEvent(hawb.id, hawb.trackingNumber, CargoStatus.ACCEPTED, extra);
      }

      triggerTcraEvent(hawb.id, hawb.trackingNumber, cargoStatus as unknown as CargoStatus, extra);
      published += 1;
    } catch (error) {
      console.error(`[TCRA] Failed to queue event for ${hawb.trackingNumber}:`, error);
    }
  }

  return published;
}
