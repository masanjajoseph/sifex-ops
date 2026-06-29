import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/tcra/signing";
import { TcraResponseCode } from "@/lib/tcra/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const signature = request.headers.get("Authorization") ?? "";
    const sigValue = signature.replace(/^Signature\s*/i, "");
    if (sigValue && !(await verifySignature(body, sigValue))) {
      return NextResponse.json(
        {
          msgInfo: { timestamp: new Date().toISOString(), msgId: "" },
          msgResponse: {
            code: TcraResponseCode.GENERAL_ERROR,
            txnId: "",
            message: "Invalid signature",
          },
        },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const { msgInfo, missingMsgIds } = data;

    const found: { msgId: string }[] = [];

    for (const item of missingMsgIds ?? []) {
      const exists = await prisma.trackingEvent.findFirst({
        where: { metadata: { path: ["msgId"], equals: item.msgId } },
        select: { id: true },
      });
      if (exists) found.push(item);
    }

    const timestamp = new Date().toISOString();

    return NextResponse.json({
      msgInfo: {
        timestamp,
        msgId: msgInfo?.msgId ?? "",
      },
      msgResponse: {
        code: TcraResponseCode.OK,
        txnId: `ack-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        message: found.length
          ? `Found ${found.length} of ${(missingMsgIds ?? []).length} messages`
          : "Operation Successful",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        msgInfo: { timestamp: new Date().toISOString(), msgId: "" },
        msgResponse: {
          code: TcraResponseCode.GENERAL_ERROR,
          txnId: "",
          message: (err as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
