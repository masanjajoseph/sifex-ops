import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { getNotifications, getUnreadCount, markAllAsRead, archiveAllRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const category = searchParams.get("category") || undefined;

  if (category) {
    const { getNotificationsByCategory } = await import("@/lib/notifications");
    const result = await getNotificationsByCategory(session.user.id!, category, limit, offset);
    const unread = await getUnreadCount(session.user.id!);
    return apiSuccess({ ...result, unread });
  }

  const result = await getNotifications(session.user.id!, limit, offset, unreadOnly);
  const unread = await getUnreadCount(session.user.id!);

  return apiSuccess({ ...result, unread });
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  if (body.markAll) {
    await markAllAsRead(session.user.id!);
  }
  if (body.archiveAll) {
    await archiveAllRead(session.user.id!);
  }

  return apiSuccess({ success: true });
});
