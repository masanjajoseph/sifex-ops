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
 * Per the TCRA technical specification, the `msgId` always ends with the
 * snapshot operation code (`OT06`), while `operationCode` identifies the
 * operation of the shipments being reconciled — `OT01` for today's accepted
 * shipments, `OT02` for dispatched, and so on. Sending `OT06` in
 * `operationCode` is reported by TCRA as a wrong operation type.
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
      operationCode: operation,
      operatorCode: TCRA_OPERATOR_CODE,
      operationType: operation,
    },
    txnInfo: msgIds.map((id) => ({ msgId: id })),
  };

  return client.pushSnapshot(req);
}
