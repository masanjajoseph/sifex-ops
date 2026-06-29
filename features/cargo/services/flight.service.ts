import { flightRepository } from "../repositories/flight.repository";
import { masterAWBRepository } from "../repositories/master-awb.repository";
import { AppError, NotFoundError, ConflictError } from "@/lib/errors";

export interface ScheduleFlightParams {
  airlineId: string;
  flightNumber: string;
  aircraftType?: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: Date;
  arrivalTime: Date;
  totalCapacity: number;
}

export class FlightService {
  async scheduleFlight(params: ScheduleFlightParams) {
    const existing = await flightRepository.findByFlightNumber(params.flightNumber);
    if (existing) {
      throw new ConflictError(`Flight ${params.flightNumber} already exists`);
    }

    const flight = await flightRepository.save({
      id: crypto.randomUUID(),
      airlineId: params.airlineId,
      flightNumber: params.flightNumber,
      aircraftType: params.aircraftType ?? null,
      originStationId: params.originStationId,
      destinationStationId: params.destinationStationId,
      departureTime: params.departureTime,
      arrivalTime: params.arrivalTime,
      totalCapacity: params.totalCapacity,
      availableCapacity: params.totalCapacity,
      status: "SCHEDULED",
    });

    return flight;
  }

  async updateFlightStatus(flightId: string, status: string) {
    const flight = await flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundError("Flight");
    }

    const validStatuses = ["SCHEDULED", "CONFIRMED", "DEPARTED", "ARRIVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        `Invalid flight status: ${status}. Valid: ${validStatuses.join(", ")}`,
        422,
        "INVALID_STATUS"
      );
    }

    return flightRepository.save({
      ...flight,
      status,
    });
  }

  async getFlightSchedule(
    origin?: string,
    destination?: string,
    date?: Date
  ) {
    const where: {
      status?: string;
      originStationId?: string;
      destinationStationId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {};

    if (origin) where.originStationId = origin;
    if (destination) where.destinationStationId = destination;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.dateFrom = startOfDay;
      where.dateTo = endOfDay;
    }

    return flightRepository.findMany(where);
  }

  async getAvailableCapacity(flightId: string) {
    const flight = await flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundError("Flight");
    }

    const masterAWBs = await masterAWBRepository.findByFlight(flight.flightNumber);
    const bookedWeight = masterAWBs.reduce((sum, m) => sum + m.getState().totalWeight, 0);

    return {
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      totalCapacity: flight.totalCapacity,
      availableCapacity: flight.totalCapacity - bookedWeight,
      bookedWeight,
    };
  }
}

export const flightService = new FlightService();
