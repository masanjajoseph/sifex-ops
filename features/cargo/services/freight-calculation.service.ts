import { prisma } from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export type ShipmentType = $Enums.ShipmentType;
export type PaymentMode = $Enums.PaymentMode;

export interface FreightRate {
  id: string;
  shipmentType: string;
  minimumWeight: number;
  maximumWeight: number;
  ratePerKg: number;
  currency: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  isActive: boolean;
}

export class FreightCalculationService {
  async getApplicableRate(
    shipmentType: ShipmentType,
    weight: number
  ): Promise<FreightRate | null> {
    const now = new Date();

    const rate = await prisma.freightRate.findFirst({
      where: {
        shipmentType,
        isActive: true,
      },
      orderBy: { ratePerKg: "asc" },
    });

    return rate as unknown as FreightRate | null;
  }

  calculateChargeableWeight(
    actualWeight: number,
    length: number,
    width: number,
    height: number,
    divisor: number = 6000
  ): { chargeableWeight: number; volumeWeight: number } {
    const volumeWeight = (length * width * height) / divisor;
    const chargeableWeight = Math.max(actualWeight, volumeWeight);

    return { chargeableWeight, volumeWeight };
  }

  async calculateFreight(params: {
    shipmentType: ShipmentType;
    actualWeight: number;
    length: number;
    width: number;
    height: number;
    divisor?: number;
  }): Promise<
    | {
        chargeableWeight: number;
        volumeWeight: number;
        ratePerKg: number;
        freight: number;
        currency: string;
      }
    | { error: string }
  > {
    const { chargeableWeight, volumeWeight } = this.calculateChargeableWeight(
      params.actualWeight,
      params.length,
      params.width,
      params.height,
      params.divisor
    );

    const rate = await this.getApplicableRate(
      params.shipmentType,
      chargeableWeight
    );

    if (!rate) {
      return { error: "No applicable freight rate found" };
    }

    const freight = chargeableWeight * rate.ratePerKg;

    return {
      chargeableWeight,
      volumeWeight,
      ratePerKg: rate.ratePerKg,
      freight,
      currency: rate.currency,
    };
  }

  calculateInsurance(value: number, rate: number = 0.005): number {
    return value * rate;
  }

  async autoCalculate(params: {
    shipmentType: ShipmentType;
    actualWeight: number;
    length: number;
    width: number;
    height: number;
    customsValue: number;
    paymentMode: PaymentMode;
  }): Promise<{
    chargeableWeight: number;
    volumeWeight: number;
    ratePerKg: number;
    freight: number;
    insurance: number;
    currency: string;
  }> {
    const { chargeableWeight, volumeWeight } = this.calculateChargeableWeight(
      params.actualWeight,
      params.length,
      params.width,
      params.height
    );

    const rate = await this.getApplicableRate(
      params.shipmentType,
      chargeableWeight
    );

    const ratePerKg = rate?.ratePerKg ?? 0;
    const currency = rate?.currency ?? "USD";
    const freight = chargeableWeight * ratePerKg;
    const insurance = this.calculateInsurance(params.customsValue);

    return {
      chargeableWeight,
      volumeWeight,
      ratePerKg,
      freight,
      insurance,
      currency,
    };
  }
}

export const freightCalculationService = new FreightCalculationService();
