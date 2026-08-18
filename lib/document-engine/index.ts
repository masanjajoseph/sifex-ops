import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createActivityFeedEntry } from "@/lib/activity-feed";
import { publishDocumentUpdate } from "@/lib/realtime/publisher";
import { eventDispatcher } from "@/lib/events/event-dispatcher";
import { createEvent } from "@/lib/events/event-bus";
import { EventType } from "@/lib/events/event-types";

const DOCUMENT_PREFIXES: Record<string, string> = {
  QUOTE: "QTE",
  BOOKING: "BKG",
  HAWB: "HAWB",
  MAWB: "MAWB",
  MANIFEST: "MFT",
  COMMERCIAL_INVOICE: "CINV",
  CUSTOMER_INVOICE: "INV",
  RECEIPT: "RCT",
  WAREHOUSE_RECEIPT: "WR",
  DELIVERY_NOTE: "DN",
  PROOF_OF_DELIVERY: "POD",
  CARGO_LABEL: "LBL",
  PACKING_LIST: "PKL",
  CUSTOM_DOCUMENT: "DOC",
  BARCODE_LABEL: "BCL",
  QR_LABEL: "QRL",
  CONTAINER_MANIFEST: "CMF",
  CERTIFICATE_OF_ORIGIN: "COO",
  INSURANCE_CERTIFICATE: "INC",
};

const DOCUMENT_SERIALIZERS: Record<string, (data: any) => Buffer | Promise<Buffer>> = {
  HAWB: async (data) => Buffer.from(`HAWB: ${data.houseAWBNumber}\nShipper: ${data.shipperName}\nReceiver: ${data.receiverName}`),
  MAWB: async (data) => Buffer.from(`MAWB: ${data.awbNumber}\nOrigin: ${data.originStation}\nDestination: ${data.destinationStation}`),
  CUSTOMER_INVOICE: async (data) => Buffer.from(`INVOICE: ${data.invoiceNumber}\nAmount: ${data.amount} ${data.currency}`),
  RECEIPT: async (data) => Buffer.from(`RECEIPT: ${data.receiptNumber}\nAmount: ${data.amount} ${data.currency}`),
  DELIVERY_NOTE: async (data) => Buffer.from(`DELIVERY NOTE: ${data.deliveryNoteNumber}\nCustomer: ${data.customerName}`),
  PROOF_OF_DELIVERY: async (data) => Buffer.from(`POD: ${data.podNumber}\nSigned by: ${data.signedBy}`),
  CARGO_LABEL: async (data) => Buffer.from(`LABEL: ${data.trackingNumber}\nPieces: ${data.pieces}\nWeight: ${data.weight}`),
  BARCODE_LABEL: async (data) => Buffer.from(`BARCODE: ${data.barcodeData}`),
  QR_LABEL: async (data) => Buffer.from(`QR: ${data.qrData}`),
};

async function getNextSerial(documentType: string): Promise<string> {
  const count = await prisma.document.count({ where: { documentType: documentType as any } });
  const prefix = DOCUMENT_PREFIXES[documentType] || "DOC";
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

export async function generateDocument(
  documentType: string,
  entityType: string,
  entityId: string,
  entityNumber: string | null | undefined,
  generatedById: string,
  templateCode?: string,
  contentData?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const documentNumber = await getNextSerial(documentType);

    let templateId: string | undefined;
    if (templateCode) {
      const template = await prisma.documentTemplate.findUnique({ where: { code: templateCode } });
      if (template) templateId = template.id;
    }

    const doc = await prisma.document.create({
      data: {
        documentNumber,
        documentType: documentType as any,
        status: "GENERATED",
        templateId,
        entityType,
        entityId,
        entityNumber: entityNumber || undefined,
        contentData: contentData as any,
        generatedById,
        generatedAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: generatedById },
      select: { id: true, firstName: true, lastName: true, departmentId: true, department: { select: { name: true } } },
    });

    await createActivityFeedEntry({
      eventType: "document.generated",
      title: `${documentType} ${documentNumber} generated`,
      description: `Document ${documentNumber} generated for ${entityType} ${entityNumber || entityId}`,
      entityType,
      entityId,
      entityNumber: entityNumber || documentNumber,
      userId: generatedById,
      userName: user ? `${user.firstName} ${user.lastName}` : "System",
      departmentId: user?.departmentId || undefined,
      departmentName: user?.department?.name || undefined,
      action: "DOCUMENT_GENERATED",
      metadata: { documentId: doc.id, documentType, documentNumber },
    });

    await publishDocumentUpdate({
      id: doc.id,
      documentNumber,
      documentType,
      entityType,
      entityId,
      status: "GENERATED",
    });

    await eventDispatcher.dispatch(
      createEvent(
        EventType.DOCUMENT_GENERATED,
        entityType,
        entityId,
        { documentId: doc.id, documentType, documentNumber, entityType, entityId } as any,
        generatedById,
      ),
    );

    return doc.id;
  } catch (error) {
    logger.error("Failed to generate document", error as Error, "DocumentEngine");
    return null;
  }
}

export async function generateDocumentWithPdf(
  documentType: string,
  entityType: string,
  entityId: string,
  entityNumber: string | null | undefined,
  generatedById: string,
  serializerData?: any,
): Promise<string | null> {
  const docId = await generateDocument(documentType, entityType, entityId, entityNumber, generatedById, undefined, serializerData);
  if (!docId) return null;

  try {
    const serializer = DOCUMENT_SERIALIZERS[documentType];
    if (serializer) {
      const pdfBuffer = await serializer(serializerData || {});
      const serialized = pdfBuffer.toString("base64");

      await prisma.document.update({
        where: { id: docId },
        data: {
          status: "GENERATED",
          contentData: { ...serializerData, pdfContent: serialized } as any,
        },
      });
    }
  } catch (error) {
    logger.error(`Failed to generate PDF for ${documentType}`, error as Error, "DocumentEngine");
  }

  return docId;
}

export async function signDocument(
  documentId: string,
  userId: string,
  signature: string,
): Promise<void> {
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    include: { generatedBy: { select: { firstName: true, lastName: true } } },
  });
  if (!existing) return;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      signature,
      signedById: userId,
      signedAt: new Date(),
      status: "SIGNED",
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, departmentId: true, department: { select: { name: true } } },
  });

  await createActivityFeedEntry({
    eventType: "document.signed",
    title: `Document ${existing.documentNumber} signed`,
    description: `${existing.documentType} ${existing.documentNumber} signed digitally`,
    entityType: existing.entityType,
    entityId: existing.entityId,
    entityNumber: existing.entityNumber || existing.documentNumber,
    userId,
    userName: user ? `${user.firstName} ${user.lastName}` : "System",
    departmentId: user?.departmentId || undefined,
    departmentName: user?.department?.name || undefined,
    action: "DOCUMENT_SIGNED",
    metadata: { documentId, signature },
  });

  await eventDispatcher.dispatch(
    createEvent(
      EventType.DOCUMENT_SIGNED,
      existing.entityType,
      existing.entityId,
      { documentId, documentType: existing.documentType, documentNumber: existing.documentNumber } as any,
      userId,
    ),
  );
}

export async function createDocumentVersion(
  documentId: string,
  contentData: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;

  const versionNumber = (doc as any).version || 1;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      contentData: { ...(doc.contentData as any || {}), ...contentData } as any,
      metadata: { ...((doc as any).metadata as any || {}), lastVersion: versionNumber + 1 } as any,
      generatedById: userId,
      generatedAt: new Date(),
    },
  });
}

export async function getDocumentsForEntity(
  entityType: string,
  entityId: string,
  documentType?: string,
) {
  const where: any = { entityType, entityId, deletedAt: null };
  if (documentType) where.documentType = documentType;

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      generatedBy: { select: { id: true, firstName: true, lastName: true } },
      signedBy: { select: { id: true, firstName: true, lastName: true } },
      template: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function getDocumentsByType(documentType: string, limit = 50, offset = 0) {
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { documentType: documentType as any, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        generatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.document.count({ where: { documentType: documentType as any, deletedAt: null } }),
  ]);
  return { documents, total };
}

export async function getDocumentStats() {
  const [byType, byStatus, total] = await Promise.all([
    prisma.document.groupBy({
      by: ["documentType"],
      _count: true,
      where: { deletedAt: null },
    }),
    prisma.document.groupBy({
      by: ["status"],
      _count: true,
      where: { deletedAt: null },
    }),
    prisma.document.count({ where: { deletedAt: null } }),
  ]);

  return {
    total,
    byType: byType.map(t => ({ type: t.documentType, count: t._count })),
    byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
  };
}

export async function getDocumentById(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      generatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      signedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      template: true,
    },
  });
}
