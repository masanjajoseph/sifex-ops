import { prisma } from "@/lib/prisma";
import { createTcraClient } from "./client";
import { TcraOperationCode, TCRA_OPERATOR_CODE } from "./types";

const client = createTcraClient();

function toIsoLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

let serialCounter = 0;

function nextSerial(): string {
  serialCounter += 1;
  return String(serialCounter).padStart(6, "0");
}

export async function sendDailySnapshot(dateFrom: Date, dateTo: Date) {
  const events = await prisma.houseAWB.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      deletedAt: null,
    },
    select: { trackingNumber: true },
  });

  const now = new Date();
  const timestamp = toIsoLocal(now);
  const msgId = `${TCRA_OPERATOR_CODE}-${timestamp}-${TcraOperationCode.SNAPSHOT}-${nextSerial()}`;

  const req = {
    msgInfo: {
      timestamp,
      msgId,
      operationCode: TcraOperationCode.SNAPSHOT,
      operatorCode: TCRA_OPERATOR_CODE,
    },
    txnInfo: events.map((e) => ({
      msgId: `${TCRA_OPERATOR_CODE}-${toIsoLocal(new Date())}-${TcraOperationCode.ACCEPTANCE}-${nextSerial()}`,
    })),
  };

  return client.pushSnapshot(req);
}
