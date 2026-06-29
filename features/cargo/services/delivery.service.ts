import { deliveryAssignmentRepository } from "../repositories/delivery-assignment.repository";
import { AppError, NotFoundError } from "@/lib/errors";
import { CargoEventType } from "@/types/cargo-domain";
import { shipmentTimelineService } from "./shipment-timeline.service";

export interface AssignDeliveryParams {
  riderId: string;
  houseAWBId?: string;
  masterAWBId?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
  userId: string;
}

const ACTIVE_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];

export class DeliveryService {
  async assignDelivery(params: AssignDeliveryParams) {
    const assignment = await deliveryAssignmentRepository.create({
      riderId: params.riderId,
      houseAWBId: params.houseAWBId,
      masterAWBId: params.masterAWBId,
      pickupAddress: params.pickupAddress,
      deliveryAddress: params.deliveryAddress,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      notes: params.notes,
      status: "ASSIGNED",
    });

    await shipmentTimelineService.addEvent({
      aggregateId: params.houseAWBId ?? params.masterAWBId!,
      aggregateType: params.houseAWBId ? "HouseAWB" : "MasterAWB",
      eventType: CargoEventType.EXPORT_PICKUP_ASSIGNED,
      userId: params.userId,
      metadata: { deliveryId: assignment.id, riderId: params.riderId },
    });

    return assignment;
  }

  async pickup(deliveryId: string, userId: string) {
    const delivery = await deliveryAssignmentRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError("Delivery assignment");
    }

    if (delivery.status !== "ASSIGNED") {
      throw new AppError(
        `Cannot pick up delivery with status ${delivery.status}. Must be ASSIGNED.`,
        422,
        "INVALID_STATUS"
      );
    }

    const updated = await deliveryAssignmentRepository.updateStatus(deliveryId, "PICKED_UP", {
      pickedUpAt: new Date(),
    });

    await shipmentTimelineService.addEvent({
      aggregateId: delivery.houseAWBId ?? delivery.masterAWBId!,
      aggregateType: delivery.houseAWBId ? "HouseAWB" : "MasterAWB",
      eventType: CargoEventType.EXPORT_PICKED_UP,
      userId,
      metadata: { deliveryId },
    });

    return updated;
  }

  async deliver(deliveryId: string, userId: string) {
    const delivery = await deliveryAssignmentRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError("Delivery assignment");
    }

    if (!["PICKED_UP", "IN_TRANSIT"].includes(delivery.status)) {
      throw new AppError(
        `Cannot mark delivery as delivered with status ${delivery.status}. Must be PICKED_UP or IN_TRANSIT.`,
        422,
        "INVALID_STATUS"
      );
    }

    const updated = await deliveryAssignmentRepository.updateStatus(deliveryId, "DELIVERED", {
      deliveredAt: new Date(),
    });

    await shipmentTimelineService.addEvent({
      aggregateId: delivery.houseAWBId ?? delivery.masterAWBId!,
      aggregateType: delivery.houseAWBId ? "HouseAWB" : "MasterAWB",
      eventType: CargoEventType.IMPORT_DELIVERED,
      userId,
      metadata: { deliveryId },
    });

    return updated;
  }

  async failDelivery(deliveryId: string, reason: string, userId: string) {
    const delivery = await deliveryAssignmentRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError("Delivery assignment");
    }

    if (["DELIVERED", "RETURNED"].includes(delivery.status)) {
      throw new AppError(
        `Cannot fail a delivery that is already ${delivery.status}.`,
        422,
        "INVALID_STATUS"
      );
    }

    const updated = await deliveryAssignmentRepository.updateStatus(deliveryId, "FAILED", {
      failedAt: new Date(),
      failureReason: reason,
    });

    await shipmentTimelineService.addEvent({
      aggregateId: delivery.houseAWBId ?? delivery.masterAWBId!,
      aggregateType: delivery.houseAWBId ? "HouseAWB" : "MasterAWB",
      eventType: CargoEventType.WAREHOUSE_EXCEPTION,
      userId,
      metadata: { deliveryId, failureReason: reason },
    });

    return updated;
  }

  async returnDelivery(deliveryId: string, userId: string) {
    const delivery = await deliveryAssignmentRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError("Delivery assignment");
    }

    if (!["PICKED_UP", "IN_TRANSIT", "FAILED"].includes(delivery.status)) {
      throw new AppError(
        `Cannot return delivery with status ${delivery.status}.`,
        422,
        "INVALID_STATUS"
      );
    }

    const updated = await deliveryAssignmentRepository.updateStatus(deliveryId, "RETURNED");

    await shipmentTimelineService.addEvent({
      aggregateId: delivery.houseAWBId ?? delivery.masterAWBId!,
      aggregateType: delivery.houseAWBId ? "HouseAWB" : "MasterAWB",
      eventType: CargoEventType.WAREHOUSE_DISPATCHED,
      userId,
      metadata: { deliveryId, returnStatus: "RETURNED" },
    });

    return updated;
  }

  async getRiderDeliveries(riderId: string, status?: string) {
    return deliveryAssignmentRepository.findByRider(riderId, { status });
  }


}

export const deliveryService = new DeliveryService();
