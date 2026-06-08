import { organizationRepository } from "../repositories/organization.repository";
import { branchRepository } from "../repositories/branch.repository";
import { stationRepository } from "../repositories/station.repository";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateOrganizationParams {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  branchName?: string;
  branchCode?: string;
  stationName?: string;
  stationCode?: string;
}

export interface AddBranchParams {
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface AddStationParams {
  name: string;
  code: string;
  type: string;
  branchId: string;
  address?: string;
  city?: string;
  country?: string;
}

export class OrganizationService {
  async createOrganization(params: CreateOrganizationParams) {
    const existing = await organizationRepository.findByCode(params.code);
    if (existing) {
      throw new ConflictError(`Organization with code ${params.code} already exists`);
    }

    const org = await organizationRepository.create({
      name: params.name,
      code: params.code,
      email: params.email,
      phone: params.phone,
      address: params.address,
      city: params.city,
      country: params.country,
    });

    const branch = await branchRepository.create({
      name: params.branchName ?? `${params.name} Head Office`,
      code: params.branchCode ?? `${params.code}-HQ`,
      organizationId: org.id,
      address: params.address,
      city: params.city,
      country: params.country,
    });

    const station = await stationRepository.create({
      name: params.stationName ?? `${params.name} Main Station`,
      code: params.stationCode ?? `${params.code}-MAIN`,
      type: "OFFICE",
      organizationId: org.id,
      branchId: branch.id,
      address: params.address,
      city: params.city,
      country: params.country,
    });

    return {
      ...org,
      defaultBranch: branch,
      defaultStation: station,
    };
  }

  async addBranch(organizationId: string, params: AddBranchParams) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError("Organization");
    }

    return branchRepository.create({
      ...params,
      organizationId,
    });
  }

  async addStation(organizationId: string, params: AddStationParams) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError("Organization");
    }

    return stationRepository.create({
      ...params,
      organizationId,
    });
  }

  async getOrganizationTree(organizationId: string) {
    const tree = await organizationRepository.findTree(organizationId);
    if (!tree) {
      throw new NotFoundError("Organization");
    }

    return {
      id: tree.id,
      name: tree.name,
      code: tree.code,
      isActive: tree.isActive,
      branches: tree.branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        isActive: b.isActive,
        stations: b.stations.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          type: s.type,
          isActive: s.isActive,
          address: s.address,
          city: s.city,
          country: s.country,
        })),
      })),
    };
  }
}

export const organizationService = new OrganizationService();
