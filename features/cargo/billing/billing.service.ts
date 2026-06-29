import { BillingStatus, CargoEventType } from "@/types/cargo-domain";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";

export interface BillingChargeInput {
  houseAWBId: string;
  type: "PICKUP" | "CONSOLIDATION" | "CUSTOMS_CLEARANCE" | "STORAGE" | "HANDLING" | "AIRLINE_FREIGHT" | "DELIVERY" | "SURCHARGE";
  amount: number;
  currency: string;
  description: string;
}

export interface BillingRecordData {
  id: string;
  houseAWBId: string;
  status: BillingStatus;
  charges: BillingChargeInput[];
  totalAmount: number;
  currency: string;
  paidAmount: number;
  remainingAmount: number;
  invoicedAt?: Date;
  fullyPaidAt?: Date;
}

export class BillingService {
  async calculateCharges(params: {
    houseAWBId: string;
    weight: number;
    volume: number;
    pieces: number;
    originCountry: string;
    destinationCountry: string;
    services: string[];
  }): Promise<BillingChargeInput[]> {
    const charges: BillingChargeInput[] = [];

    charges.push({
      houseAWBId: params.houseAWBId,
      type: "HANDLING",
      amount: params.pieces * 5.0,
      currency: "USD",
      description: `Handling fee for ${params.pieces} piece(s)`,
    });

    charges.push({
      houseAWBId: params.houseAWBId,
      type: "AIRLINE_FREIGHT",
      amount: params.weight * 2.5,
      currency: "USD",
      description: `Air freight for ${params.weight}kg`,
    });

    if (params.services.includes("customs_clearance")) {
      charges.push({
        houseAWBId: params.houseAWBId,
        type: "CUSTOMS_CLEARANCE",
        amount: 50.0,
        currency: "USD",
        description: "Customs clearance fee",
      });
    }

    if (params.services.includes("pickup")) {
      charges.push({
        houseAWBId: params.houseAWBId,
        type: "PICKUP",
        amount: 25.0,
        currency: "USD",
        description: "Pickup service fee",
      });
    }

    if (params.services.includes("delivery")) {
      charges.push({
        houseAWBId: params.houseAWBId,
        type: "DELIVERY",
        amount: 35.0,
        currency: "USD",
        description: "Last-mile delivery fee",
      });
    }

    return charges;
  }

  async generateInvoice(params: {
    houseAWBId: string;
    charges: BillingChargeInput[];
    userId: string;
  }): Promise<BillingRecordData | { errors: string[] }> {
    const totalAmount = params.charges.reduce((sum, c) => sum + c.amount, 0);

    const record: BillingRecordData = {
      id: crypto.randomUUID(),
      houseAWBId: params.houseAWBId,
      status: BillingStatus.NOT_BILLED,
      charges: params.charges,
      totalAmount,
      currency: "USD",
      paidAmount: 0,
      remainingAmount: totalAmount,
    };

    await createAuditLog({
      userId: params.userId,
      action: "CREATE",
      entity: "BillingRecord",
      entityId: record.id,
      metadata: {
        houseAWBId: params.houseAWBId,
        totalAmount,
        chargeCount: params.charges.length,
      },
    });

    eventBus.publish(
      createEvent("billing.charges_calculated", "Billing", record.id, {
        houseAWBId: params.houseAWBId,
        totalAmount,
        charges: params.charges,
      }, params.userId)
    );

    return record;
  }

  async recordPayment(params: {
    billingRecordId: string;
    amount: number;
    method: string;
    reference: string;
    userId: string;
  }): Promise<{ success: boolean; remainingAmount: number; errors?: string[] }> {
    const remaining = 0; // Would be fetched from actual record

    await createAuditLog({
      userId: params.userId,
      action: "APPROVE",
      entity: "Payment",
      entityId: params.billingRecordId,
      metadata: {
        amount: params.amount,
        method: params.method,
        reference: params.reference,
      },
    });

    const paidAmount = params.amount;
    const newRemaining = Math.max(0, remaining - paidAmount);

    return {
      success: true,
      remainingAmount: newRemaining,
    };
  }
}

export const billingService = new BillingService();
