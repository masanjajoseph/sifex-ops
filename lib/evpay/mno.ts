import crypto from "crypto";

export interface MnoPaymentRequest {
  api_source: string;
  api_to: string;
  amount: number;
  product: string;
  callback: string;
  hash: string;
  user: string;
  mobileNo: string;
  reference: string;
  callbackstatus: string;
}

export interface MnoPaymentResponse {
  order_id: string;
  amount: number;
  response_code: number;
  response_desc: string;
  source: string;
}

export interface MnoCallbackPayload {
  ResultType: boolean;
  TransactionStatus: string;
  TransID: string;
  Amount: string;
  Hash: string;
  ThirdPartyReference: string;
}

function generateHash(username: string, dateStr: string): string {
  return crypto.createHash("md5").update(`${username}|${dateStr}`).digest("hex");
}

export function buildMnoPayload(params: {
  apiTo: string;
  amount: number;
  product: string;
  mobileNo: string;
  reference: string;
  callbackUrl: string;
}): MnoPaymentRequest {
  const username = process.env.EVMAK_MNO_USERNAME || "";
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const hash = generateHash(username, dateStr);

  return {
    api_source: "SIFEX",
    api_to: params.apiTo,
    amount: params.amount,
    product: params.product,
    callback: params.callbackUrl,
    hash,
    user: username,
    mobileNo: params.mobileNo,
    reference: params.reference,
    callbackstatus: "Success",
  };
}

export async function sendMnoPaymentRequest(
  payload: MnoPaymentRequest,
): Promise<MnoPaymentResponse> {
  const apiUrl = process.env.EVMAK_MNO_API_URL || "https://vodaapi.evmak.com/test/";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function verifyMnoCallback(
  payload: MnoCallbackPayload,
  username?: string,
): boolean {
  const user = username || process.env.EVMAK_MNO_USERNAME || "";
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const expected = generateHash(user, dateStr);
  return expected === payload.Hash && payload.ResultType === true;
}
