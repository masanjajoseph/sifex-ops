import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/tcra/signing";
import { TcraResponseCode } from "@/lib/tcra/types";

export const dynamic = "force-dynamic";

/**
 * TCRA's snapshot callback: it reports the msgIds it did not receive, so the
 * operator can resend them. The response code must be RC00 for TCRA to accept
 * the handshake.
 *
 * Signature enforcement is opt-in (`TCRA_CALLBACK_VERIFY=true`) until TCRA
 * shares the public key they sign callbacks with; otherwise every callback
 * would be rejected while we can only verify with our own key pair.
 */
const REQUIRE_CALLBACK_SIGNATURE = process.env.TCRA_CALLBACK_VERIFY === "true";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // The callback is reconciliation only — log it so a missing "found" count
    // can never be mistaken for a delivery failure.
    const preview = body.length > 500 ? `${body.slice(0, 500)}…` : body;

    const signature = request.headers.get("Authorization") ?? request.headers.get("signature") ?? "";
    const sigValue = signature.replace(/^Signature\s*/i, "");
    if (sigValue) {
      let valid = false;
      try {
        valid = await verifySignature(body, sigValue);
      } catch {
        // No verification key available yet — keep the callback answerable.
      }
      console.info(`[tcra:callback] signature present, verified=${valid}`);
      if (!valid && REQUIRE_CALLBACK_SIGNATURE) {
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
    }

    const data = JSON.parse(body);
    const { msgInfo, missingMsgIds } = data;
    const missingCount = Array.isArray(missingMsgIds) ? missingMsgIds.length : 0;
    console.info(`[tcra:callback] msgId=${msgInfo?.msgId ?? "-"} missing=${missingCount} body=${preview}`);

    const found: { msgId: string }[] = [];

    for (const item of missingMsgIds ?? []) {
      if (typeof item?.msgId !== "string" || item.msgId.length === 0) continue;
      // The events we sent live in the outbox, not in the tracking timeline.
      const exists = await prisma.tcraOutbox.findFirst({
        where: {
          status: "SENT",
          payload: { path: ["eventsList"], array_contains: [{ msgInfo: { msgId: item.msgId } }] },
        },
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
