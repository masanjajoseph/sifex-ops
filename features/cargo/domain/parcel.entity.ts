import { ParcelState } from "./types";

export interface CreateParcelInput {
  houseAWBId: string;
  description: string;
  quantity: number;
  weight: number;
  volume: number;
  value: number;
  hsCode: string;
  packageType: string;
}

export class Parcel {
  private state: ParcelState;

  private constructor(state: ParcelState) {
    this.state = { ...state };
  }

  static create(input: CreateParcelInput): Parcel {
    const volumetricWeight = Parcel.calculateVolumetricWeight(input.volume);
    const barcode = Parcel.generateBarcode(input.houseAWBId);

    const state: ParcelState = {
      id: crypto.randomUUID(),
      houseAWBId: input.houseAWBId,
      description: input.description,
      quantity: input.quantity,
      weight: input.weight,
      volume: input.volume,
      volumetricWeight,
      value: input.value,
      hsCode: input.hsCode,
      barcode,
      packageType: input.packageType,
      condition: "GOOD",
      createdAt: new Date(),
    };

    return new Parcel(state);
  }

  getState(): Readonly<ParcelState> {
    return { ...this.state };
  }

  getId(): string {
    return this.state.id;
  }

  getWeight(): number {
    return this.state.weight;
  }

  getVolume(): number {
    return this.state.volume;
  }

  getQuantity(): number {
    return this.state.quantity;
  }

  getVolumetricWeight(): number {
    return this.state.volumetricWeight;
  }

  getChargeableWeight(): number {
    return Math.max(this.state.weight, this.state.volumetricWeight);
  }

  getBarcode(): string {
    return this.state.barcode;
  }

  markDamaged(damageReport: string): void {
    this.state.condition = "DAMAGED";
  }

  markLost(incidentReport: string): void {
    this.state.condition = "LOST";
  }

  markGood(): void {
    this.state.condition = "GOOD";
  }

  static calculateVolumetricWeight(volume: number): number {
    // Standard IATA formula: volume in cm³ / 6000 = volumetric weight in kg
    // Assuming volume is stored in m³, convert: 1 m³ = 1,000,000 cm³
    const volumeCm3 = volume * 1000000;
    return Math.ceil(volumeCm3 / 6000);
  }

  static generateBarcode(houseAWBId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PRC-${timestamp}${random}`;
  }

  static validateDimensions(
    weight: number,
    volume: number,
    quantity: number
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (weight <= 0) errors.push("Weight must be positive");
    if (volume <= 0) errors.push("Volume must be positive");
    if (quantity <= 0) errors.push("Quantity must be positive");
    if (!Number.isInteger(quantity)) errors.push("Quantity must be an integer");

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  static hydrate(state: ParcelState): Parcel {
    return new Parcel(state);
  }
}
