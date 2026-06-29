import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const items = await prisma.airline.findMany({
    where: {  deletedAt: null, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, iataCode: true, name: true },
  });

  return apiSuccess(items);
});
