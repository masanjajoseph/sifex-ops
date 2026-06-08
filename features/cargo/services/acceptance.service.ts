import { prisma } from "@/lib/prisma";
import { Prisma, $Enums } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { trackingService } from "@/features/cargo/services/tracking.service";
import { freightCalculationService } from "@/features/cargo/services/freight-calculation.service";
import { generateShipmentBarcode } from "@/lib/barcode";

export type ShipmentType = $Enums.ShipmentType;
export type PaymentMode = $Enums.PaymentMode;
export type CargoStatus = $Enums.CargoStatus;

interface SenderInfo {
  name: string;
  address: string;
  company?: string;
  phone?: string;
  city?: string;
  country?: string;
}

interface ReceiverInfo {
  name: string;
  address: string;
  company?: string;
  phone?: string;
  city?: string;
  country?: string;
}

interface ParcelInput {
  description: string;
  quantity: number;
  actualWeight: number;
  length: number;
  width: number;
  height: number;
  hsCode: string;
  packageType: string;
  value?: number;
}

interface AcceptShipmentParams {
  organizationId: string;
  userId: string;
  sender: SenderInfo;
  receiver: ReceiverInfo;
  parcels: ParcelInput[];
  shipmentType: ShipmentType;
  paymentMode: PaymentMode;
  currency: string;
  customsValue: number;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  originStationId: string;
  destinationStationId: string;
  orderNumber?: string;
  description?: string;
  expectedArrivalDate?: string;
}

function generateAWBNumber(
  prefix: string,
  stationCode: string,
  seq: number
): string {
  return `${prefix}-${stationCode}-${String(seq).padStart(6, "0")}`;
}

function generateDeclarationNumber(type: string): string {
  const prefix = type === "IMPORT" ? "IMP" : "EXP";
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

export class AcceptanceService {
  async acceptShipment(params: AcceptShipmentParams) {
    const station = await prisma.station.findUnique({
      where: { id: params.originStationId },
    });

    if (!station) {
      throw new AppError("Origin station not found", 404, "NOT_FOUND");
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { organizationId: params.organizationId },
    });

    const prefix = settings?.trackingPrefix ?? "SFX";

    const freight = await freightCalculationService.autoCalculate({
      shipmentType: params.shipmentType,
      actualWeight: params.parcels.reduce(
        (sum, p) => sum + p.actualWeight * p.quantity,
        0
      ),
      length: params.parcels[0]?.length ?? 0,
      width: params.parcels[0]?.width ?? 0,
      height: params.parcels[0]?.height ?? 0,
      customsValue: params.customsValue,
      paymentMode: params.paymentMode,
    });

    const totalPieces = params.parcels.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    const totalWeight = params.parcels.reduce(
      (sum, p) => sum + p.actualWeight * p.quantity,
      0
    );

    const trackingNumber = await trackingService.generateMasterTrackingNumber(
      prefix,
      station.code
    );

    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const awbSeq = await prisma.masterAWB.count({
      where: {
        awbNumber: { startsWith: `${prefix}-${station.code}-` },
      },
    });
    const awbNumber = generateAWBNumber(prefix, station.code, awbSeq + 1);

    return prisma.$transaction(async (tx) => {
      const senderCustomer = await this.findOrCreateCustomer(
        tx,
        params.organizationId,
        params.sender
      );

      const receiverCustomer = await this.findOrCreateCustomer(
        tx,
        params.organizationId,
        params.receiver
      );

      const masterAWB = await tx.masterAWB.create({
        data: {
          organizationId: params.organizationId,
          awbNumber,
          trackingNumber,
          orderNumber: params.orderNumber ?? null,
          senderName: params.sender.name,
          senderAddress: params.sender.address,
          senderCompany: params.sender.company ?? null,
          senderPhone: params.sender.phone ?? null,
          senderCity: params.sender.city ?? null,
          senderCountry: params.sender.country ?? null,
          receiverName: params.receiver.name,
          receiverAddress: params.receiver.address,
          receiverCompany: params.receiver.company ?? null,
          receiverPhone: params.receiver.phone ?? null,
          receiverCity: params.receiver.city ?? null,
          receiverCountry: params.receiver.country ?? null,
          description: params.description ?? null,
          freight: freight.freight,
          freightRate: freight.ratePerKg,
          insurance: freight.insurance,
          awbPieces: totalPieces,
          awbWeight: totalWeight,
          chargeableWeight: freight.chargeableWeight,
          volumeWeight: freight.volumeWeight,
          length: params.parcels[0]?.length ?? 0,
          width: params.parcels[0]?.width ?? 0,
          height: params.parcels[0]?.height ?? 0,
          volume:
            (params.parcels[0]?.length ?? 0) *
            (params.parcels[0]?.width ?? 0) *
            (params.parcels[0]?.height ?? 0),
          currency: freight.currency,
          customsValue: params.customsValue,
          paymentMode: params.paymentMode,
          shipmentType: params.shipmentType,
          expectedArrivalDate: params.expectedArrivalDate
            ? new Date(params.expectedArrivalDate)
            : null,
          cargoStatus: "INITIATED",
          warehouseStatus: "RECEIVED",
          billingStatus: "NOT_BILLED",
          originStationId: params.originStationId,
          destinationStationId: params.destinationStationId,
          currentStationId: params.originStationId,
          airlineId: "",
          flightNumber: "",
          departureTime: new Date(),
          arrivalTime: new Date(),
          customsStatus: "DECLARED",
          receivedAt: new Date(),
        },
      });

      const houseTrackingNumber =
        await trackingService.generateHouseTrackingNumber(prefix);

      const houseAWB = await tx.houseAWB.create({
        data: {
          organizationId: params.organizationId,
          masterAWBId: masterAWB.id,
          houseAWBNumber: houseTrackingNumber,
          trackingNumber: houseTrackingNumber,
          orderNumber: params.orderNumber ?? null,
          shipperId: senderCustomer.id,
          receiverId: receiverCustomer.id,
          description: params.description ?? null,
          pieces: totalPieces,
          weight: totalWeight,
          volume:
            (params.parcels[0]?.length ?? 0) *
            (params.parcels[0]?.width ?? 0) *
            (params.parcels[0]?.height ?? 0),
          chargeableWeight: freight.chargeableWeight,
          volumeWeight: freight.volumeWeight,
          length: params.parcels[0]?.length ?? 0,
          width: params.parcels[0]?.width ?? 0,
          height: params.parcels[0]?.height ?? 0,
          freight: freight.freight,
          freightRate: freight.ratePerKg,
          insurance: freight.insurance,
          currency: freight.currency,
          customsValue: params.customsValue,
          paymentMode: params.paymentMode,
          shipmentType: params.shipmentType,
          hsCode: params.hsCode,
          originCountry: params.originCountry,
          destinationCountry: params.destinationCountry,
          cargoStatus: "INITIATED",
          warehouseStatus: "RECEIVED",
          billingStatus: "NOT_BILLED",
          receivedAt: new Date(),
          expectedArrivalDate: params.expectedArrivalDate
            ? new Date(params.expectedArrivalDate)
            : null,
        },
      });

      const parcels = [];
      for (let i = 0; i < params.parcels.length; i++) {
        const p = params.parcels[i];
        const parcelTrackingNumber =
          await trackingService.generateParcelTrackingNumber(
            prefix,
            i + 1
          );
        const barcode = generateShipmentBarcode(parcelTrackingNumber);
        const volume = p.length * p.width * p.height;
        const volumetricWeight =
          (p.length * p.width * p.height) / 6000;

        const parcel = await tx.parcel.create({
          data: {
            houseAWBId: houseAWB.id,
            parcelTrackingNumber,
            barcode,
            qrCode: null,
            serialNumber: null,
            description: p.description,
            quantity: p.quantity,
            actualWeight: p.actualWeight,
            volumetricWeight,
            length: p.length,
            width: p.width,
            height: p.height,
            volume,
            value: p.value ?? 0,
            hsCode: p.hsCode,
            packageType: p.packageType,
            condition: "GOOD",
          },
        });
        parcels.push(parcel);
      }

      await trackingService.createTrackingEvent({
        organizationId: params.organizationId,
        entityType: "MasterAWB",
        entityId: masterAWB.id,
        eventType: "SHIPMENT_INITIATED",
        status: "INITIATED",
        title: "Shipment Initiated",
        description: "Shipment record created",
        userId: params.userId,
        stationId: params.originStationId,
        scanSource: "MANUAL",
        metadata: {
          masterAWBId: masterAWB.id,
          houseAWBId: houseAWB.id,
          awbNumber,
          trackingNumber,
          parcelCount: parcels.length,
        },
      });

      await trackingService.createTrackingEvent({
        organizationId: params.organizationId,
        entityType: "MasterAWB",
        entityId: masterAWB.id,
        eventType: "SHIPMENT_ACCEPTED",
        status: "ACCEPTED",
        title: "Shipment Accepted",
        description: "Shipment has been accepted into the system",
        userId: params.userId,
        stationId: params.originStationId,
        scanSource: "MANUAL",
        metadata: { freight: freight.freight, currency: freight.currency },
      });

      await trackingService.createTrackingEvent({
        organizationId: params.organizationId,
        entityType: "MasterAWB",
        entityId: masterAWB.id,
        eventType: "RECEIVED_AT_STATION",
        status: "RCS",
        title: `Received at ${station.name}`,
        description: `Cargo received at ${station.name} (${station.code})`,
        userId: params.userId,
        stationId: params.originStationId,
        scanSource: "WAREHOUSE",
        metadata: { stationCode: station.code, stationName: station.name },
      });

      await tx.warehouseInventory.create({
        data: {
          organizationId: params.organizationId,
          stationId: params.originStationId,
          houseAWBId: houseAWB.id,
          masterAWBId: masterAWB.id,
          status: "RECEIVED",
          quantity: totalPieces,
          weight: totalWeight,
          volume:
            (params.parcels[0]?.length ?? 0) *
            (params.parcels[0]?.width ?? 0) *
            (params.parcels[0]?.height ?? 0),
          receivedAt: new Date(),
        },
      });

      const billingRecord = await tx.billingRecord.create({
        data: {
          organizationId: params.organizationId,
          customerId: senderCustomer.id,
          houseAWBId: houseAWB.id,
          masterAWBId: masterAWB.id,
          status: "NOT_BILLED",
          totalAmount: freight.freight + freight.insurance,
          currency: freight.currency,
          paidAmount: 0,
          remainingAmount: freight.freight + freight.insurance,
        },
      });

      const declarationNumber = generateDeclarationNumber("EXPORT");

      const customsDeclaration = await tx.customsDeclaration.create({
        data: {
          organizationId: params.organizationId,
          houseAWBId: houseAWB.id,
          masterAWBId: masterAWB.id,
          declarationNumber,
          declarationType: "EXPORT",
          status: "DECLARED",
          totalDeclaredValue: params.customsValue,
          totalDeclaredWeight: totalWeight,
          hsCode: params.hsCode,
          originCountry: params.originCountry,
          destinationCountry: params.destinationCountry,
          submittedAt: new Date(),
          submittedBy: params.userId,
        },
      });

      await tx.customsItem.createMany({
        data: params.parcels.map((p) => ({
          declarationId: customsDeclaration.id,
          description: p.description,
          quantity: p.quantity,
          weight: p.actualWeight,
          value: p.value ?? 0,
          hsCode: p.hsCode,
        })),
      });

      return {
        masterAWB: masterAWB as unknown as Record<string, unknown>,
        houseAWB: houseAWB as unknown as Record<string, unknown>,
        parcels: parcels as unknown as Record<string, unknown>[],
        billing: billingRecord as unknown as Record<string, unknown>,
        customs: customsDeclaration as unknown as Record<string, unknown>,
      };
    });
  }

  private async findOrCreateCustomer(
    tx: Prisma.TransactionClient,
    organizationId: string,
    info: SenderInfo | ReceiverInfo
  ) {
    const name = info.company ?? info.name;
    const existing = await tx.customer.findFirst({
      where: {
        organizationId,
        name,
      },
    });

    if (existing) return existing;

    const code =
      name.substring(0, 3).toUpperCase() +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    return tx.customer.create({
      data: {
        organizationId,
        type: info.company ? "COMPANY" : "INDIVIDUAL",
        name,
        code,
        phone: info.phone ?? null,
        address: info.address,
        city: info.city ?? null,
        country: info.country ?? null,
        isActive: true,
        creditLimit: 0,
        creditBalance: 0,
        paymentTerms: "NET30",
      },
    });
  }
}

export const acceptanceService = new AcceptanceService();
