import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateEntityBarcode, generateBulkBarcodes, generateTrackingQr, generateShipmentQr, generateQrSvg, generateBarcodeSvg } from "@/lib/barcode";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const type = searchParams.get("type") || "barcode";
  const format = searchParams.get("format") || "json";

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
  }

  if (type === "qr") {
    const trackingNumber = searchParams.get("trackingNumber") || entityId;
    const qrData = generateShipmentQr(entityId, trackingNumber);

    if (format === "svg") {
      const svg = generateQrSvg(qrData);
      return new NextResponse(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
      });
    }

    return NextResponse.json({ qrData, type: "qr", entityType, entityId });
  }

  const barcode = generateEntityBarcode(entityType, entityId);

  if (format === "svg") {
    const svg = generateBarcodeSvg(barcode);
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
    });
  }

  return NextResponse.json({ barcode, type: "barcode", entityType, entityId });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, entityType, entityIds, trackingNumber } = body;

  if (action === "bulk" && entityType && entityIds) {
    const barcodes = await generateBulkBarcodes(entityType, entityIds);
    return NextResponse.json({ barcodes });
  }

  if (action === "tracking-qr" && trackingNumber) {
    const qrData = generateTrackingQr(trackingNumber);
    return NextResponse.json({ qrData });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
