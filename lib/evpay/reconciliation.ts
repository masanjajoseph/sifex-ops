import crypto from "crypto";

function generateAuthHeaders(clientId?: string, clientSecret?: string) {
  const id = clientId || process.env.EVMAK_CLIENT_ID || "";
  const secret = clientSecret || process.env.EVMAK_CLIENT_SECRET || "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${id}|${timestamp}`)
    .digest("hex");

  return {
    "X-Client-Id": id,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    Accept: "application/json",
  };
}

export interface ReconciliationResponse {
  status: string;
  data?: {
    reference: string;
    payment_id: string;
    status: string;
    outcome: string;
    amount: string;
    authorized_amount: string;
    currency: string;
    payment_method: string;
    card_number: string;
    card_type: string;
    approval_code: string;
    retrieval_reference_number: string;
    reconciliation_id: string;
    customer: {
      name: string;
      email: string;
      phone: string;
      country: string;
    };
    created_at: string;
  };
  message?: string;
}

export async function getTransaction(
  reference: string,
): Promise<ReconciliationResponse> {
  const baseUrl = process.env.EVMAK_API_URL || "https://checkout-uat.evpay.co.tz";
  const headers = generateAuthHeaders();

  const res = await fetch(
    `${baseUrl}/api/v1/reconciliation/${encodeURIComponent(reference)}`,
    { headers },
  );
  return res.json();
}

export async function reconMnoTransaction(params: {
  reference: string;
  user: string;
  hash: string;
}): Promise<Record<string, unknown>> {
  const apiUrl = process.env.EVMAK_MNO_API_URL || "https://vodaapi.evmak.com/test/";
  const res = await fetch(`${apiUrl}/recon/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}
