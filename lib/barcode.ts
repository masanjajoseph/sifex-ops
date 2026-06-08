// Barcode and QR code utilities foundation

export interface BarcodeData {
  type: "shipment" | "package" | "customer" | "invoice";
  id: string;
  metadata?: Record<string, unknown>;
}

export const generateBarcodeData = (data: BarcodeData): string => {
  return JSON.stringify(data);
};

export const parseBarcodeData = (raw: string): BarcodeData | null => {
  try {
    return JSON.parse(raw) as BarcodeData;
  } catch {
    return null;
  }
};

export const generateShipmentBarcode = (shipmentId: string): string => {
  return generateBarcodeData({
    type: "shipment",
    id: shipmentId,
  });
};

export const generatePackageBarcode = (packageId: string): string => {
  return generateBarcodeData({
    type: "package",
    id: packageId,
  });
};

export const generateInvoiceBarcode = (invoiceId: string): string => {
  return generateBarcodeData({
    type: "invoice",
    id: invoiceId,
  });
};

// Barcode format validation
export const isValidBarcode = (barcode: string): boolean => {
  const data = parseBarcodeData(barcode);
  return data !== null && !!data.type && !!data.id;
};
