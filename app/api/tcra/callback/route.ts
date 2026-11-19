import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/tcra/signing";
import { createTcraClient } from "@/lib/tcra/client";
import { TcraResponseCode, type TcraEvent } from "@/lib/tcra/types";

export const dynamic = "force-dynamic";
// The client signs with node:crypto and posts through node:https.
export const runtime = "nodejs";

const client = createTcraClient();

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
    const { msgInfo } = data;

    // TCRA sends the missing references in one of two shapes:
    //   { "missingMsgIds": [...] }                  (technical spec sample)
    //   { "txnInfo": { "missingMsgIds": [...] } }   (observed live 2026-11-19)
    // Accept both so a real gap is never reported as success.
    const rawMissing = data.missingMsgIds ?? data.txnInfo?.missingMsgIds;
    const missingMsgIds: { msgId: string }[] = Array.isArray(rawMissing)
      ? rawMissing
          .map((entry: unknown) =>
            typeof entry === "string"
              ? { msgId: entry }
              : { msgId: (entry as { msgId?: unknown })?.msgId }
          )
          .filter((entry): entry is { msgId: string } => typeof entry.msgId === "string" && entry.msgId.length > 0)
      : [];
    const missingCount = missingMsgIds.length;
    const callbackMsgId = msgInfo?.callbackMsgId ?? "-";
    console.info(
      `[tcra:callback] msgId=${msgInfo?.msgId ?? "-"} op=${msgInfo?.operationCode ?? "-"} callbackMsgId=${callbackMsgId} missing=${missingCount} body=${preview}`,
    );

    let resent = 0;
    let notFound = 0;
    let failed = 0;

    for (const item of missingMsgIds) {
      // The events we sent live in the outbox, not in the tracking timeline.
      const row = await prisma.tcraOutbox.findFirst({
        where: {
          status: "SENT",
          payload: { path: ["eventsList"], array_contains: [{ msgInfo: { msgId: item.msgId } }] },
        },
        select: { id: true, payload: true },
      });

      if (!row) {
        notFound += 1;
        console.warn(`[tcra:callback] msgId not in outbox: ${item.msgId}`);
        continue;
      }

      const payload = row.payload as { eventsList?: TcraEvent[] } | null;
      const event = payload?.eventsList?.find((entry) => entry?.msgInfo?.msgId === item.msgId);
      if (!event) {
        notFound += 1;
        console.warn(`[tcra:callback] outbox row ${row.id} has no event ${item.msgId}`);
        continue;
      }

      // Re-send the exact event under its original msgId so TCRA can reconcile
      // it. pushEvents rebuilds the body in TCRA's declared field order and
      // signs those bytes.
      try {
        const response = await client.pushEvents({ eventsList: [event] });
        const code = Array.isArray(response) ? response[0]?.msgResponse?.code : undefined;
        const txnId = Array.isArray(response) ? response[0]?.msgResponse?.txnId : undefined;
        if (code === TcraResponseCode.OK) {
          resent += 1;
          console.info(`[tcra:callback] resent ${item.msgId} txnId=${txnId ?? "-"}`);
        } else {
          failed += 1;
          console.warn(`[tcra:callback] resend ${item.msgId} answered ${code ?? "no code"}`);
        }
      } catch (err) {
        failed += 1;
        console.error(`[tcra:callback] resend ${item.msgId} failed: ${(err as Error).message}`);
      }
    }

    const timestamp = new Date().toISOString();

    let message = "Operation Successful";
    let code: TcraResponseCode = TcraResponseCode.OK;
    if (missingCount > 0) {
      message = `Received ${missingCount} missing msgIds, resent ${resent}`;
      if (notFound > 0) message += `, not found ${notFound}`;
      if (failed > 0) message += `, failed ${failed}`;
      if (notFound > 0 || failed > 0) code = TcraResponseCode.GENERAL_ERROR;
    }
    console.info(`[tcra:callback] ${message} (${code})`);

    return NextResponse.json({
      msgInfo: {
        timestamp,
        msgId: msgInfo?.msgId ?? "",
      },
      msgResponse: {
        code,
        txnId: `ack-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        message,
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
