import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createTcraClient } from "./client";
import type { TcraEventRequest, TcraEventResponse } from "./types";

const client = createTcraClient();

export interface EnqueueEventParams {
  houseAWBId: string;
  trackingNumber: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

export async function enqueueEvent(params: EnqueueEventParams) {
  await prisma.tcraOutbox.create({
    data: {
      houseAWBId: params.houseAWBId,
      trackingNumber: params.trackingNumber,
      eventType: params.eventType,
      payload: params.payload,
      status: "PENDING",
    },
  });
}

export async function processPendingEvents(batchSize = 20) {
  const pending = await prisma.tcraOutbox.findMany({
    where: { status: "PENDING" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  for (const item of pending) {
    try {
      const req = item.payload as unknown as TcraEventRequest;
      const res: TcraEventResponse = await client.pushEvents(req);
      const allOk = res.every((r) => r.msgResponse.code === "RC00");
      await prisma.tcraOutbox.update({
        where: { id: item.id },
        data: {
          status: allOk ? "SENT" : "FAILED",
          response: res as unknown as Prisma.InputJsonValue,
          sentAt: new Date(),
          attempts: { increment: 1 },
        },
      });
    } catch (err) {
      const attempts = item.attempts + 1;
      const status = attempts >= 5 ? "FAILED" : "PENDING";
      await prisma.tcraOutbox.update({
        where: { id: item.id },
        data: {
          status,
          error: (err as Error).message,
          attempts,
        },
      });
    }
  }

  return pending.length;
}
