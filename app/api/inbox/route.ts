import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { getWorkInbox, getInboxSummary } from "@/lib/work-inbox";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (scope === "summary") {
    const summary = await getInboxSummary(session.user.id!);
    return apiSuccess(summary);
  }

  const inbox = await getWorkInbox(session.user.id!);
  return apiSuccess(inbox);
});
