import crypto from "crypto";

export interface CheckoutPayload {
  total: string;
  currency: string;
  reference: string;
  country: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address1: string;
  locality: string;
  administrativeArea: string;
  postalCode: string;
  returnUrl?: string;
  buildingNumber?: string;
}

export function buildCheckoutUrl(payload: CheckoutPayload): string {
  const clientId = process.env.EVMAK_CLIENT_ID || "";
  const secret = process.env.EVMAK_CLIENT_SECRET || "";
  const baseUrl = process.env.EVMAK_API_URL || "https://checkout-uat.evpay.co.tz";

  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");

  return `${baseUrl}/checkout/${clientId}?data=${encodeURIComponent(data)}&sig=${sig}`;
}

export function verifyCallbackSignature(
  data: string,
  sig: string,
  secret?: string,
): boolean {
  const key = secret || process.env.EVMAK_CLIENT_SECRET || "";
  const expected = crypto.createHmac("sha256", key).update(data).digest("hex");
  return expected === sig;
}
