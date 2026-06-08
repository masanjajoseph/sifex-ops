import { MasterAWBAggregate } from "../domain/master-awb.aggregate";
import { HouseAWBAggregate } from "../domain/house-awb.aggregate";
import { TransitionResult } from "../domain/types";
import { masterAWBRepository } from "../repositories/master-awb.repository";
import { houseAWBRepository } from "../repositories/house-awb.repository";

export class ConsolidationService {
  async attachHouseAWBToMaster(
    masterAWBId: string,
    houseAWBId: string,
    userId: string
  ): Promise<TransitionResult> {
    const masterAWB = await masterAWBRepository.findById(masterAWBId);
    if (!masterAWB) {
      return { success: false, errors: ["Master AWB not found"] };
    }

    const houseAWB = await houseAWBRepository.findById(houseAWBId);
    if (!houseAWB) {
      return { success: false, errors: ["House AWB not found"] };
    }

    const capacityCheck = masterAWB.canAttachHouseAWB(
      houseAWB.getState().totalWeight,
      houseAWB.getState().totalVolume
    );

    if (!capacityCheck.allowed) {
      return { success: false, errors: [capacityCheck.reason ?? "Capacity validation failed"] };
    }

    const attachResult = masterAWB.attachHouseAWB(
      houseAWBId,
      houseAWB.getState().totalWeight,
      houseAWB.getState().totalVolume,
      houseAWB.getState().totalPieces,
      userId
    );

    if (!attachResult.success) {
      return attachResult;
    }

    const hawbAttachResult = houseAWB.attachToMaster(masterAWBId, userId);

    if (!hawbAttachResult.success) {
      return hawbAttachResult;
    }

    await masterAWBRepository.save(masterAWB);
    await houseAWBRepository.save(houseAWB);

    return { success: true };
  }

  async detachHouseAWBFromMaster(
    masterAWBId: string,
    houseAWBId: string,
    userId: string
  ): Promise<TransitionResult> {
    const masterAWB = await masterAWBRepository.findById(masterAWBId);
    if (!masterAWB) {
      return { success: false, errors: ["Master AWB not found"] };
    }

    const houseAWB = await houseAWBRepository.findById(houseAWBId);
    if (!houseAWB) {
      return { success: false, errors: ["House AWB not found"] };
    }

    const detachResult = masterAWB.detachHouseAWB(
      houseAWBId,
      houseAWB.getState().totalWeight,
      houseAWB.getState().totalVolume,
      houseAWB.getState().totalPieces,
      userId
    );

    if (!detachResult.success) {
      return detachResult;
    }

    const hawbDetachResult = houseAWB.detachFromMaster(userId);

    await masterAWBRepository.save(masterAWB);
    await houseAWBRepository.save(houseAWB);

    return { success: true };
  }

  async finalizeConsolidation(masterAWBId: string, userId: string): Promise<TransitionResult> {
    const masterAWB = await masterAWBRepository.findById(masterAWBId);
    if (!masterAWB) {
      return { success: false, errors: ["Master AWB not found"] };
    }

    const result = masterAWB.finalizeConsolidation(userId);
    if (result.success) {
      await masterAWBRepository.save(masterAWB);
    }

    return result;
  }

  async getConsolidationStatus(masterAWBId: string): Promise<{
    masterAWB: any;
    houseAWBs: any[];
    totalUtilization: number;
  } | null> {
    const masterAWB = await masterAWBRepository.findById(masterAWBId);
    if (!masterAWB) return null;

    const houseAWBs = await houseAWBRepository.findByMasterAWB(masterAWBId);
    const state = masterAWB.getState();

    return {
      masterAWB: state,
      houseAWBs: houseAWBs.map((h) => h.getState()),
      totalUtilization: state.totalWeight,
    };
  }
}

export const consolidationService = new ConsolidationService();
