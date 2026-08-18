import { NextRequest, NextResponse } from "next/server";
import { handleSmsCallback } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messageId, status, phoneNumber, error } = body;

  if (!messageId || !status) {
    return NextResponse.json({ error: "messageId and status required" }, { status: 400 });
  }

  await handleSmsCallback({ messageId, status, phoneNumber, error });
  return NextResponse.json({ success: true });
}
