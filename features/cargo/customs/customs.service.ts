import { CustomsStatus, CargoEventType } from "@/types/cargo-domain";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { createAuditLog } from "@/services/audit";

export interface CustomsDeclarationInput {
  houseAWBId?: string;
  masterAWBId?: string;
  declarationType: "EXPORT" | "IMPORT";
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  items: Array<{
    description: string;
    quantity: number;
    weight: number;
    value: number;
    hsCode: string;
  }>;
  userId: string;
}

export interface CustomsDeclarationData {
  id: string;
  houseAWBId?: string;
  masterAWBId?: string;
  declarationNumber: string;
  declarationType: "EXPORT" | "IMPORT";
  status: CustomsStatus;
  items: Array<{
    description: string;
    quantity: number;
    weight: number;
    value: number;
    hsCode: string;
  }>;
  totalDeclaredValue: number;
  totalDeclaredWeight: number;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  submittedAt: Date;
  submittedBy: string;
}

export class CustomsService {
  async submitDeclaration(input: CustomsDeclarationInput): Promise<CustomsDeclarationData | { errors: string[] }> {
    const errors: string[] = [];

    if (!input.houseAWBId && !input.masterAWBId) {
      errors.push("Either houseAWBId or masterAWBId must be provided");
    }

    if (input.items.length === 0) {
      errors.push("At least one customs item is required");
    }

    if (errors.length > 0) {
      return { errors };
    }

    const totalDeclaredValue = input.items.reduce((sum, i) => sum + i.value * i.quantity, 0);
    const totalDeclaredWeight = input.items.reduce((sum, i) => sum + i.weight * i.quantity, 0);

    const declaration: CustomsDeclarationData = {
      id: crypto.randomUUID(),
      houseAWBId: input.houseAWBId,
      masterAWBId: input.masterAWBId,
      declarationNumber: CustomsService.generateDeclarationNumber(input.declarationType),
      declarationType: input.declarationType,
      status: CustomsStatus.DECLARED,
      items: input.items,
      totalDeclaredValue,
      totalDeclaredWeight,
      hsCode: input.hsCode,
      originCountry: input.originCountry,
      destinationCountry: input.destinationCountry,
      submittedAt: new Date(),
      submittedBy: input.userId,
    };

    await createAuditLog({
      userId: input.userId,
      action: "CREATE",
      entity: "CustomsDeclaration",
      entityId: declaration.id,
      metadata: {
        declarationType: input.declarationType,
        totalDeclaredValue,
        totalDeclaredWeight,
        itemCount: input.items.length,
      },
    });

    const eventType = input.declarationType === "EXPORT"
      ? CargoEventType.CUSTOMS_DECLARATION_SUBMITTED
      : CargoEventType.CUSTOMS_DECLARATION_SUBMITTED;

    eventBus.publish(
      createEvent("customs.declaration_submitted", "CustomsDeclaration", declaration.id, {
        declarationNumber: declaration.declarationNumber,
        declarationType: input.declarationType,
        houseAWBId: input.houseAWBId,
        masterAWBId: input.masterAWBId,
        totalDeclaredValue,
        totalDeclaredWeight,
      }, input.userId)
    );

    return declaration;
  }

  async updateStatus(
    declarationId: string,
    newStatus: CustomsStatus,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; errors?: string[] }> {
    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "CustomsDeclaration",
      entityId: declarationId,
      metadata: {
        newStatus,
        ...metadata,
      },
    });

    eventBus.publish(
      createEvent("customs.status_changed", "CustomsDeclaration", declarationId, {
        newStatus,
        metadata,
      }, userId)
    );

    return { success: true };
  }

  async issueHold(
    declarationId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean }> {
    await createAuditLog({
      userId,
      action: "UPDATE",
      entity: "CustomsDeclaration",
      entityId: declarationId,
      metadata: {
        action: "HOLD",
        reason,
      },
    });

    eventBus.publish(
      createEvent("customs.hold_issued", "CustomsDeclaration", declarationId, {
        reason,
      }, userId)
    );

    return { success: true };
  }

  async releaseFromCustoms(
    declarationId: string,
    releasedBy: string,
    userId: string
  ): Promise<{ success: boolean }> {
    await createAuditLog({
      userId,
      action: "APPROVE",
      entity: "CustomsDeclaration",
      entityId: declarationId,
      metadata: {
        action: "RELEASE",
        releasedBy,
      },
    });

    eventBus.publish(
      createEvent("customs.released", "CustomsDeclaration", declarationId, {
        releasedBy,
      }, userId)
    );

    return { success: true };
  }

  private static generateDeclarationNumber(type: "EXPORT" | "IMPORT"): string {
    const prefix = type === "EXPORT" ? "EXP" : "IMP";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }
}

export const customsService = new CustomsService();
