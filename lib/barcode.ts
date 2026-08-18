import { prisma } from "@/lib/prisma";
import { publishScanUpdate } from "@/lib/realtime/publisher";

export interface BarcodeData {
  type: "shipment" | "package" | "customer" | "invoice" | "delivery" | "document" | "location" | "asset";
  id: string;
  metadata?: Record<string, unknown>;
}

export interface QrCodeData {
  type: "shipment" | "tracking" | "invoice" | "delivery" | "customer" | "document" | "payment" | "location";
  id: string;
  entityType?: string;
  entityId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

const ENTITY_BARCODE_PREFIX: Record<string, string> = {
  MasterAWB: "MAWB",
  HouseAWB: "HAWB",
  Customer: "CUST",
  BillingRecord: "INV",
  DeliveryTask: "DEL",
  Document: "DOC",
  Flight: "FLT",
  Manifest: "MFT",
  Parcel: "PRC",
};

export const generateBarcodeData = (data: BarcodeData): string => {
  const prefix = ENTITY_BARCODE_PREFIX[data.id.split("-")[0]] || "GEN";
  return `${prefix}-${data.type.toUpperCase().slice(0, 3)}-${data.id.slice(0, 12)}-${Date.now().toString(36).toUpperCase()}`;
};

export const parseBarcodeData = (raw: string): BarcodeData | null => {
  try {
    const parts = raw.split("-");
    if (parts.length < 3) return null;
    return {
      type: parts[1] === "SHI" ? "shipment" : parts[1] === "PKG" ? "package" : parts[1] === "CUS" ? "customer" : parts[1] === "INV" ? "invoice" : "shipment",
      id: parts.slice(2).join("-"),
    };
  } catch {
    return null;
  }
};

export const generateShipmentBarcode = (shipmentId: string): string => {
  return generateBarcodeData({ type: "shipment", id: shipmentId });
};

export const generatePackageBarcode = (packageId: string): string => {
  return generateBarcodeData({ type: "package", id: packageId });
};

export const generateInvoiceBarcode = (invoiceId: string): string => {
  return generateBarcodeData({ type: "invoice", id: invoiceId });
};

export const generateDocumentBarcode = (documentId: string): string => {
  return generateBarcodeData({ type: "document", id: documentId });
};

export const generateDeliveryBarcode = (deliveryId: string): string => {
  return generateBarcodeData({ type: "delivery", id: deliveryId });
};

export const generateCustomerBarcode = (customerId: string): string => {
  return generateBarcodeData({ type: "customer", id: customerId });
};

export const generateEntityBarcode = (entityType: string, entityId: string): string => {
  const prefix = ENTITY_BARCODE_PREFIX[entityType] || "GEN";
  return `${prefix}-${entityType.slice(0, 3).toUpperCase()}-${entityId.slice(0, 12)}-${Date.now().toString(36).toUpperCase()}`;
};

export function generateQrData(data: QrCodeData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sifex.app";
  const entitySegment = data.entityType?.toLowerCase() || data.type;
  return `${baseUrl}/tracking/${entitySegment}/${data.entityId || data.id}`;
}

export function generateShipmentQr(shipmentId: string, trackingNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sifex.app";
  return `${baseUrl}/tracking/shipment/${trackingNumber}`;
}

export function generateInvoiceQr(invoiceId: string, invoiceNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sifex.app";
  return `${baseUrl}/tracking/invoice/${invoiceNumber}`;
}

export async function recordScan(
  barcode: string,
  eventType: string,
  userId: string,
  metadata?: { houseAWBId?: string; masterAWBId?: string; stationId?: string; latitude?: number; longitude?: number; address?: string },
): Promise<void> {
  const scan = await prisma.shipmentScan.create({
    data: {
      barcode,
      eventType,
      houseAWBId: metadata?.houseAWBId,
      masterAWBId: metadata?.masterAWBId,
      userId,
      stationId: metadata?.stationId,
      latitude: metadata?.latitude,
      longitude: metadata?.longitude,
      address: metadata?.address,
      success: true,
    },
  });

  await publishScanUpdate({
    id: scan.id,
    barcode,
    eventType,
    userId,
    timestamp: scan.createdAt,
  });
}

export function formatBarcodeForLabel(barcode: string): string {
  return barcode.replace(/-/g, " ");
}

export function getEntityTypeFromBarcode(barcode: string): string | null {
  const prefix = barcode.split("-")[0];
  const reverseMap: Record<string, string> = {
    MAWB: "MasterAWB",
    HAWB: "HouseAWB",
    CUST: "Customer",
    INV: "BillingRecord",
    DEL: "DeliveryTask",
    DOC: "Document",
    FLT: "Flight",
    MFT: "Manifest",
    PRC: "Parcel",
  };
  return reverseMap[prefix] || null;
}

export async function generateBulkBarcodes(entityType: string, entityIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const id of entityIds) {
    result[id] = generateEntityBarcode(entityType, id);
  }
  return result;
}

export const isValidBarcode = (barcode: string): boolean => {
  const parts = barcode.split("-");
  return parts.length >= 3 && parts[0].length >= 2 && parts[1].length >= 2;
};

export function generateTrackingQr(trackingNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sifex.app";
  return `${baseUrl}/tracking/${trackingNumber}`;
}

export function generateBarcodeSvg(barcode: string): string {
  const code39 = barcode.replace(/-/g, " ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${code39.length * 12}" height="60">
    <rect width="100%" height="100%" fill="white"/>
    <text x="10" y="35" font-family="monospace" font-size="24" font-weight="bold" fill="black">${code39}</text>
    <text x="10" y="52" font-family="monospace" font-size="10" fill="black">${barcode.slice(0, 20)}</text>
  </svg>`;
}

export function generateQrSvg(qrData: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="170">
    <rect width="150" height="150" fill="white"/>
    <rect x="15" y="15" width="120" height="120" fill="black"/>
    <rect x="25" y="25" width="40" height="40" fill="white"/>
    <rect x="85" y="25" width="40" height="40" fill="white"/>
    <rect x="25" y="85" width="40" height="40" fill="white"/>
    <text x="5" y="165" font-family="monospace" font-size="8" fill="black">${qrData.slice(0, 25)}</text>
  </svg>`;
}
