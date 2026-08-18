import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { generateDocument, generateDocumentWithPdf, getDocumentsForEntity, getDocumentStats, getDocumentsByType, getDocumentById, signDocument, createDocumentVersion } from "@/lib/document-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const documentType = searchParams.get("documentType") || undefined;
  const scope = searchParams.get("scope");
  const id = searchParams.get("id");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (id) {
    const doc = await getDocumentById(id);
    return apiSuccess(doc);
  }

  if (scope === "stats") {
    const stats = await getDocumentStats();
    return apiSuccess(stats);
  }

  if (scope === "templates") {
    const templates = await prisma.documentTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return apiSuccess(templates);
  }

  if (entityType && entityId) {
    const documents = await getDocumentsForEntity(entityType, entityId, documentType);
    return apiSuccess(documents);
  }

  if (documentType) {
    const result = await getDocumentsByType(documentType, limit);
    return apiSuccess(result);
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit2 = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const status = searchParams.get("status") || undefined;

  const where: any = { deletedAt: null };
  if (documentType) where.documentType = documentType;
  if (status) where.status = status;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: cursor ? 0 : (page - 1) * limit2,
      take: limit2,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        generatedBy: { select: { id: true, firstName: true, lastName: true } },
        signedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  const hasMore = documents.length > limit2;
  const data = hasMore ? documents.slice(0, limit2) : documents;

  return apiSuccess({
    documents: data,
    total,
    hasMore,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1].id : undefined,
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "generate") {
    const docId = body.generatePdf
      ? await generateDocumentWithPdf(
          body.documentType,
          body.entityType,
          body.entityId,
          body.entityNumber,
          session.user.id!,
          body.contentData,
        )
      : await generateDocument(
          body.documentType,
          body.entityType,
          body.entityId,
          body.entityNumber,
          session.user.id!,
          body.templateCode,
          body.contentData,
        );
    return apiSuccess({ id: docId }, 201);
  }

  if (action === "sign" && body.documentId) {
    await signDocument(body.documentId, session.user.id!, body.signature);
    return apiSuccess({ success: true });
  }

  if (action === "newVersion" && body.documentId) {
    await createDocumentVersion(body.documentId, body.contentData || {}, session.user.id!);
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
