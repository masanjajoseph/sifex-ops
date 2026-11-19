import { prisma } from "@/lib/prisma";
import { createTcraClient } from "./client";
import { toTcraTimestamp } from "./time";
import { TcraOperationCode, TCRA_OPERATOR_CODE } from "./types";

const client = createTcraClient();

function toIsoLocal(date: Date): string {
  return toTcraTimestamp(date);
}

function nextSerial(): string {
  return String(Date.now() % 1_000_000).padStart(6, "0");
}

/**
 * Collect the msgIds of the events that TCRA already acknowledged (RC00) in
 * the given window, for one operation only. The snapshot is a reconciliation
 * request per operation type: an "accepted" snapshot must not mix in dispatched
 * events, so the caller passes the operation it is reconciling.
 */
async function collectSentMsgIds(
  dateFrom: Date,
  dateTo: Date,
  operation: TcraOperationCode,
): Promise<string[]> {
  const rows = await prisma.tcraOutbox.findMany({
    where: {
      status: "SENT",
      sentAt: { gte: dateFrom, lte: dateTo },
    },
    select: { payload: true },
    orderBy: { sentAt: "asc" },
  });

  const msgIds: string[] = [];
  for (const row of rows) {
    const payload = row.payload as
      | { eventsList?: { msgInfo?: { msgId?: string; operationCode?: string } }[] }
      | null;
    for (const event of payload?.eventsList ?? []) {
      // The snapshot only lists the messages of the operation it covers.
      if (event?.msgInfo?.operationCode !== operation) continue;
      const msgId = event.msgInfo.msgId;
      if (typeof msgId === "string" && msgId.length > 0 && !msgIds.includes(msgId)) {
        msgIds.push(msgId);
      }
    }
  }
  return msgIds;
}

/**
 * Daily snapshot for one operation type.
 *
 * Confirmed with TCRA (2026-11-18): `operationCode` answers "what is this API
 * for?" and is therefore always the snapshot code `OT06`, while `operationType`
 * answers "what is this snapshot for?" — `OT01` for the day's accepted
 * shipments, `OT02` for dispatched, and so on. The `msgId` also keeps the
 * snapshot suffix (`...-OT06-000001`).
 */
export async function sendDailySnapshot(
  dateFrom: Date,
  dateTo: Date,
  operation: TcraOperationCode = TcraOperationCode.ACCEPTANCE,
) {
  const msgIds = await collectSentMsgIds(dateFrom, dateTo, operation);

  const now = new Date();
  const timestamp = toIsoLocal(now);
  const msgId = `${TCRA_OPERATOR_CODE}-${timestamp}-${TcraOperationCode.SNAPSHOT}-${nextSerial()}`;

  // Field order matters: TCRA re-serialises msgInfo into its own struct before
  // verifying the RSA signature, and that struct declares operatorCode BEFORE
  // operationType. Sending any other order produces RC02 "NOT VERIFIED" even
  // though the signature is correct.
  const req = {
    msgInfo: {
      timestamp,
      msgId,
      operationCode: TcraOperationCode.SNAPSHOT,
      operatorCode: TCRA_OPERATOR_CODE,
      operationType: operation,
    },
    txnInfo: msgIds.map((id) => ({ msgId: id })),
  };

  return client.pushSnapshot(req);
}
