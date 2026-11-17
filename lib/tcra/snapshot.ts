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
 * the given window. The snapshot is a reconciliation request: it has to
 * reference the exact msgIds that were sent to /v1/api/events, otherwise
 * TCRA has nothing to reconcile against.
 */
async function collectSentMsgIds(dateFrom: Date, dateTo: Date): Promise<string[]> {
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
    const payload = row.payload as { eventsList?: { msgInfo?: { msgId?: string } }[] } | null;
    for (const event of payload?.eventsList ?? []) {
      const msgId = event?.msgInfo?.msgId;
      if (typeof msgId === "string" && msgId.length > 0 && !msgIds.includes(msgId)) {
        msgIds.push(msgId);
      }
    }
  }
  return msgIds;
}

export async function sendDailySnapshot(dateFrom: Date, dateTo: Date) {
  const msgIds = await collectSentMsgIds(dateFrom, dateTo);

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
      operationType: TcraOperationCode.SNAPSHOT,
    },
    txnInfo: msgIds.map((id) => ({ msgId: id })),
  };

  return client.pushSnapshot(req);
}
