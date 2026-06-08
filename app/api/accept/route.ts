import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { AcceptShipmentSchema, CargoStatus, WarehouseStatus, BillingStatus } from "@/types/cargo-domain";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateTrackingNumber(prefix: string, orgCode: string): string {
  const rand = crypto.randomInt(100000, 999999);
  return `${prefix}-${orgCode}-${rand}`;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();
  const parsed = AcceptShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(new Error(parsed.error.issues.map((e: { message: string }) => e.message).join(", ")), 400);
  }

  const data = parsed.data;
  const orgId = session.user.organizationId!;
  const totalPieces = data.parcels.reduce((sum, p) => sum + p.quantity, 0);
  const totalWeight = data.parcels.reduce((sum, p) => sum + p.actualWeight, 0);
  const totalVolume = data.parcels.reduce((sum, p) => {
    const vol = p.length * p.width * p.height;
    return sum + vol * p.quantity;
  }, 0);
  const chargeableWeight = Math.max(totalWeight, totalVolume / 6000);

  const orgSettings = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });
  const trackingPrefix = orgSettings?.trackingPrefix || "SFX";

  const houseAWBNumber = generateTrackingNumber("HAWB", trackingPrefix);
  const masterAWBNumber = generateTrackingNumber("MAWB", trackingPrefix);

  const result = await prisma.$transaction(async (tx) => {
    const shipper = await tx.customer.create({
      data: {
        organizationId: orgId,
        name: data.sender.name,
        code: `S-${trackingPrefix}-${Date.now()}`,
        type: "COMPANY",
        email: null,
        phone: data.sender.phone,
        address: data.sender.address,
        city: data.sender.city,
        country: data.sender.country,
      },
    });

    const receiver = await tx.customer.create({
      data: {
        organizationId: orgId,
        name: data.receiver.name,
        code: `R-${trackingPrefix}-${Date.now()}`,
        type: "COMPANY",
        email: null,
        phone: data.receiver.phone,
        address: data.receiver.address,
        city: data.receiver.city,
        country: data.receiver.country,
      },
    });

    const masterAWB = await tx.masterAWB.create({
      data: {
        organizationId: orgId,
        awbNumber: masterAWBNumber,
        trackingNumber: generateTrackingNumber("MTRK", trackingPrefix),
        shipmentType: data.shipmentType,
        paymentMode: data.paymentMode,
        currency: data.currency,
        customsValue: data.customsValue,
        originStationId: data.originStationId,
        destinationStationId: data.destinationStationId,
        senderName: data.sender.name,
        senderAddress: data.sender.address,
        senderCompany: data.sender.company,
        senderPhone: data.sender.phone,
        senderCity: data.sender.city,
        senderCountry: data.sender.country,
        receiverName: data.receiver.name,
        receiverAddress: data.receiver.address,
        receiverCompany: data.receiver.company,
        receiverPhone: data.receiver.phone,
        receiverCity: data.receiver.city,
        receiverCountry: data.receiver.country,
        awbPieces: totalPieces,
        awbWeight: totalWeight,
        volume: totalVolume,
        chargeableWeight,
        volumeWeight: totalVolume / 6000,
        description: data.description,
        orderNumber: data.orderNumber,
        cargoStatus: CargoStatus.ACCEPTED,
        warehouseStatus: WarehouseStatus.RECEIVED,
        billingStatus: BillingStatus.NOT_BILLED,
        airlineId: "",
        flightNumber: "",
        departureTime: new Date(),
        arrivalTime: new Date(),
        expectedArrivalDate: data.expectedArrivalDate ? new Date(data.expectedArrivalDate) : null,
        receivedAt: new Date(),
      },
    });

    const houseAWB = await tx.houseAWB.create({
      data: {
        organizationId: orgId,
        masterAWBId: masterAWB.id,
        houseAWBNumber: houseAWBNumber,
        trackingNumber: generateTrackingNumber("HTRK", trackingPrefix),
        shipmentType: data.shipmentType,
        paymentMode: data.paymentMode,
        currency: data.currency,
        customsValue: data.customsValue,
        shipperId: shipper.id,
        receiverId: receiver.id,
        pieces: totalPieces,
        weight: totalWeight,
        volume: totalVolume,
        chargeableWeight,
        volumeWeight: totalVolume / 6000,
        hsCode: data.hsCode,
        originCountry: data.originCountry,
        destinationCountry: data.destinationCountry,
        cargoStatus: CargoStatus.ACCEPTED,
        warehouseStatus: WarehouseStatus.RECEIVED,
        billingStatus: BillingStatus.NOT_BILLED,
        description: data.description,
        receivedAt: new Date(),
      },
    });

    const createdParcels = [];
    for (const p of data.parcels) {
      const parcelVol = p.length * p.width * p.height;
      const parcel = await tx.parcel.create({
        data: {
          houseAWBId: houseAWB.id,
          parcelTrackingNumber: generateTrackingNumber("PK", trackingPrefix),
          barcode: generateTrackingNumber("BAR", trackingPrefix),
          description: p.description,
          quantity: p.quantity,
          actualWeight: p.actualWeight,
          length: p.length,
          width: p.width,
          height: p.height,
          volume: parcelVol,
          volumetricWeight: parcelVol / 6000,
          value: p.value ?? 0,
          hsCode: p.hsCode,
          packageType: p.packageType,
          condition: "GOOD",
        },
      });
      createdParcels.push(parcel);
    }

    const now = new Date();
    await tx.trackingEvent.createMany({
      data: [
        {
          organizationId:     orgId,
          entityType: "MasterAWB",
          entityId: masterAWB.id,
          eventType: "ACCEPTED",
          status: CargoStatus.ACCEPTED,
          title: "Shipment Accepted",
          description: "Shipment accepted into system",
          userId: session.user.id!,
          createdAt: now,
        },
        {
          organizationId: orgId,
          entityType: "HouseAWB",
          entityId: houseAWB.id,
          eventType: "ACCEPTED",
          status: CargoStatus.ACCEPTED,
          title: "Shipment Accepted",
          description: "Shipment accepted into system",
          userId: session.user.id,
          createdAt: now,
        },
      ],
    });

    return { masterAWB, houseAWB, parcels: createdParcels };
  });

  return apiSuccess(result, 201);
});
