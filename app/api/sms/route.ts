import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSms, sendSmsWithTemplate, getSmsHistory, processPendingSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { phoneNumber, message, templateCode, templateData, entityType, entityId, entityNumber } = body;

  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
  }

  let smsId: string | null;

  if (templateCode && templateData) {
    smsId = await sendSmsWithTemplate(templateCode, phoneNumber, templateData, {
      entityType,
      entityId,
      entityNumber,
      userId: session.user.id,
    });
  } else if (message) {
    smsId = await sendSms({
      phoneNumber,
      message,
      templateCode,
      entityType,
      entityId,
      entityNumber,
      userId: session.user.id,
    });
  } else {
    return NextResponse.json({ error: "message or templateCode+templateData required" }, { status: 400 });
  }

  if (!smsId) {
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }

  return NextResponse.json({ success: true, smsId });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const process = searchParams.get("process") === "true";

  if (process) {
    const count = await processPendingSms();
    return NextResponse.json({ processed: count });
  }

  const result = await getSmsHistory({
    limit: parseInt(searchParams.get("limit") || "50"),
    offset: parseInt(searchParams.get("offset") || "0"),
    status: searchParams.get("status") || undefined,
    phoneNumber: searchParams.get("phoneNumber") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    entityId: searchParams.get("entityId") || undefined,
  });

  return NextResponse.json(result);
}
