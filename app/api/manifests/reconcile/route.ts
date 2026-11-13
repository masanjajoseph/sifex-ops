import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createAuditLog, extractRequestMeta } from "@/services/audit";

export const dynamic = "force-dynamic";

const WEIGHT_TOLERANCE_KG = 0.5;

interface UploadedRow {
  awbNumber?: string;
  pieces?: number | string | null;
  weight?: number | string | null;
}

function normalizeAwb(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reconcile an uploaded airline / ground-handler manifest against the shipments
 * already recorded in SIFEX. This endpoint is read-only: it never mutates cargo
 * status, so the generated manifest remains the single source of truth and no
 * workflow transition is bypassed.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  if (
    !hasPermission(session, "manifests.create") &&
    !hasPermission(session, "import.update")
  ) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();
  const rawRows: UploadedRow[] = Array.isArray(body.rows) ? body.rows : [];

  const rows = rawRows
    .map((r) => ({
      awbNumber: normalizeAwb(r.awbNumber),
      pieces: toNumber(r.pieces),
      weight: toNumber(r.weight),
    }))
    .filter((r) => r.awbNumber.length > 0);

  if (rows.length === 0) {
    return apiError(new AppError("No valid AWB rows found in the uploaded manifest.", 400, "VALIDATION_ERROR"));
  }

  const awbNumbers = [...new Set(rows.map((r) => r.awbNumber))];
  const trackingNumbers = [...new Set(rows.map((r) => r.awbNumber))];

  const shipments = await prisma.masterAWB.findMany({
    where: {
      deletedAt: null,
      OR: [
        { awbNumber: { in: awbNumbers } },
        { trackingNumber: { in: trackingNumbers } },
      ],
    },
    select: {
      id: true,
      awbNumber: true,
      trackingNumber: true,
      awbPieces: true,
      awbWeight: true,
      workflowStage: true,
      workflowStatus: true,
      manifestNumber: true,
      destinationStation: { select: { code: true } },
    },
  });

  const byAwb = new Map<string, (typeof shipments)[number]>();
  const byTracking = new Map<string, (typeof shipments)[number]>();
  for (const s of shipments) {
    byAwb.set(normalizeAwb(s.awbNumber), s);
    byTracking.set(normalizeAwb(s.trackingNumber), s);
  }

  const seen = new Set<string>();
  const results = rows.map((row) => {
    const shipment = byAwb.get(row.awbNumber) ?? byTracking.get(row.awbNumber);

    if (seen.has(row.awbNumber)) {
      return {
        awbNumber: row.awbNumber,
        status: "DUPLICATE" as const,
        message: "This AWB appears more than once in the uploaded file.",
        uploadedPieces: row.pieces,
        uploadedWeight: row.weight,
        systemPieces: null,
        systemWeight: null,
        masterAWBId: shipment?.id ?? null,
      };
    }
    seen.add(row.awbNumber);

    if (!shipment) {
      return {
        awbNumber: row.awbNumber,
        status: "MISSING_IN_SYSTEM" as const,
        message: "AWB is not recorded in SIFEX.",
        uploadedPieces: row.pieces,
        uploadedWeight: row.weight,
        systemPieces: null,
        systemWeight: null,
        masterAWBId: null,
      };
    }

    const piecesOk = row.pieces === null || row.pieces === shipment.awbPieces;
    const weightOk =
      row.weight === null ||
      Math.abs(row.weight - shipment.awbWeight) <= WEIGHT_TOLERANCE_KG;

    let status: "MATCH" | "PIECES_MISMATCH" | "WEIGHT_MISMATCH" | "MULTIPLE_MISMATCH";
    if (piecesOk && weightOk) status = "MATCH";
    else if (!piecesOk && !weightOk) status = "MULTIPLE_MISMATCH";
    else if (!piecesOk) status = "PIECES_MISMATCH";
    else status = "WEIGHT_MISMATCH";

    return {
      awbNumber: row.awbNumber,
      status,
      message:
        status === "MATCH"
          ? "Matches the shipment record."
          : "Uploaded values differ from the shipment record.",
      uploadedPieces: row.pieces,
      uploadedWeight: row.weight,
      systemPieces: shipment.awbPieces,
      systemWeight: shipment.awbWeight,
      masterAWBId: shipment.id,
      systemAwbNumber: shipment.awbNumber,
      manifestNumber: shipment.manifestNumber,
      workflowStatus: shipment.workflowStatus,
      destination: shipment.destinationStation?.code ?? null,
    };
  });

  const summary = {
    total: results.length,
    matched: results.filter((r) => r.status === "MATCH").length,
    discrepancies: results.filter((r) =>
      ["PIECES_MISMATCH", "WEIGHT_MISMATCH", "MULTIPLE_MISMATCH"].includes(r.status),
    ).length,
    missingInSystem: results.filter((r) => r.status === "MISSING_IN_SYSTEM").length,
    duplicates: results.filter((r) => r.status === "DUPLICATE").length,
  };

  await createAuditLog({
    userId: session.user.id!,
    action: "UPDATE",
    entity: "Manifest",
    entityId: typeof body.manifestNumber === "string" ? body.manifestNumber : undefined,
    departmentId: session.user.departmentId || undefined,
    metadata: {
      action: "MANIFEST_RECONCILIATION",
      fileName: typeof body.fileName === "string" ? body.fileName : undefined,
      ...summary,
    },
    ...extractRequestMeta(req),
  });

  return apiSuccess({
    summary,
    rows: results,
    reconciledAt: new Date().toISOString(),
  });
});
