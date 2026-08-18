import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  if (body.avatar === undefined)
    return apiError(new Error("avatar field is required"), 400);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: body.avatar },
  });

  return apiSuccess({ message: "Avatar updated" });
});
