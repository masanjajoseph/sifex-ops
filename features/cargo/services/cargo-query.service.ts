import { masterAWBRepository } from "../repositories/master-awb.repository";
import { houseAWBRepository } from "../repositories/house-awb.repository";
import { shipmentTimelineService } from "./shipment-timeline.service";
import { MasterAWBStatus, HouseAWBStatus } from "@/types/cargo-domain";

export interface CargoSearchQuery {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CargoSummary {
  totalMAWB: number;
  totalHAWB: number;
  totalPieces: number;
  totalWeight: number;
  byStatus: Record<string, number>;
  recentlyActive: number;
}

export class CargoQueryService {
  async searchMasterAWBs(query: CargoSearchQuery) {
    return masterAWBRepository.findByOrganization({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
  }

  async searchHouseAWBs(query: CargoSearchQuery) {
    return houseAWBRepository.findByOrganization({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
  }

  async getMasterAWBTimeline(
    masterAWBId: string,
    includeInternal: boolean = false
  ) {
    if (includeInternal) {
      return shipmentTimelineService.getTimeline({
        aggregateId: masterAWBId,
        aggregateType: "MasterAWB",
      });
    }
    return shipmentTimelineService.getCustomerVisibleTimeline(
      masterAWBId,
      "MasterAWB"
    );
  }

  async getHouseAWBTimeline(
    houseAWBId: string,
    includeInternal: boolean = false
  ) {
    if (includeInternal) {
      return shipmentTimelineService.getTimeline({
        aggregateId: houseAWBId,
        aggregateType: "HouseAWB",
      });
    }
    return shipmentTimelineService.getCustomerVisibleTimeline(
      houseAWBId,
      "HouseAWB"
    );
  }

  async getConsolidatedView(masterAWBId: string) {
    const master = await masterAWBRepository.findById(masterAWBId);
    if (!master) return null;

    const houseAWBs = await houseAWBRepository.findByMasterAWB(masterAWBId);

    return {
      masterAWB: master.getState(),
      houseAWBs: houseAWBs.map((h) => h.getState()),
      totalHAWBs: houseAWBs.length,
    };
  }

  async trackByReference(
    reference: string
  ) {
    // Try tracking number first
    const byTracking = await houseAWBRepository.findByTrackingNumber(reference);
    if (byTracking) return { type: "house_awb" as const, data: byTracking.getState() };

    // Try MAWB number
    const byMAWB = await masterAWBRepository.findByMasterAWBNumber(reference);
    if (byMAWB) return { type: "master_awb" as const, data: byMAWB.getState() };

    return null;
  }

  async getDashboardSummary(): Promise<CargoSummary> {
    const [mawbResult, hawbResult] = await Promise.all([
      masterAWBRepository.findByOrganization({ pageSize: 1 }),
      houseAWBRepository.findByOrganization({ pageSize: 1 }),
    ]);

    return {
      totalMAWB: mawbResult.total,
      totalHAWB: hawbResult.total,
      totalPieces: 0,
      totalWeight: 0,
      byStatus: {},
      recentlyActive: 0,
    };
  }
}

export const cargoQueryService = new CargoQueryService();
