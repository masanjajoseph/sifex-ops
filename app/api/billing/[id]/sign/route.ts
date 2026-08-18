import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const { pin } = await req.json();
  if (!pin || typeof pin !== "string") return apiError(new Error("PIN is required"), 400);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, signaturePin: true, signatureImage: true, firstName: true, lastName: true },
  });

  if (!user || !user.signaturePin) return apiError(new Error("No signature PIN configured"), 400);

  const valid = await compare(pin, user.signaturePin);
  if (!valid) return apiError(new Error("Invalid PIN"), 403);

  const bill = await prisma.billingRecord.findUnique({ where: { id } });
  if (!bill) return apiError(new NotFoundError("Billing record"), 404);
  if (bill.signedById) return apiError(new Error("Already signed"), 409);

  const updated = await prisma.billingRecord.update({
    where: { id },
    data: {
      signedById: user.id,
      signedAt: new Date(),
    },
    include: {
      signedBy: {
        select: { id: true, firstName: true, lastName: true, signatureImage: true, position: { select: { name: true } } },
      },
    },
  });

  return apiSuccess({
    signedById: updated.signedById,
    signedAt: updated.signedAt,
    signer: updated.signedBy
      ? { name: `${updated.signedBy.firstName} ${updated.signedBy.lastName}`, title: updated.signedBy.position?.name || '', signatureImage: updated.signedBy.signatureImage }
      : null,
  });
});
