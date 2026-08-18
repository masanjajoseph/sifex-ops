import { NextRequest, NextResponse } from "next/server";
import { acknowledgeNotification } from "@/lib/notifications";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await req.json();
  if (!notificationId) {
    return NextResponse.json({ error: "notificationId required" }, { status: 400 });
  }

  await acknowledgeNotification(notificationId, session.user.id);
  return NextResponse.json({ success: true });
}
