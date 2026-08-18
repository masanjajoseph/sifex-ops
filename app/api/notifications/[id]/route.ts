import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const body = await req.json();

  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.user.id! },
  });

  if (!notification) {
    return apiError(new NotFoundError("Notification not found"));
  }

  const updateData: any = {};
  if (body.markRead) updateData.readAt = new Date();
  if (body.acknowledge) {
    updateData.acknowledgedAt = new Date();
    updateData.readAt = new Date();
  }
  if (body.archive) updateData.archivedAt = new Date();

  if (Object.keys(updateData).length === 0) {
    updateData.readAt = new Date();
  }

  await prisma.notification.update({
    where: { id },
    data: updateData,
  });

  return apiSuccess({ success: true });
});
