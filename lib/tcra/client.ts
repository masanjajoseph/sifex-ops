import { TCRA_BASE_URL, type TcraEventRequest, type TcraEventResponse, type TcraSnapshotRequest, type TcraSnapshotResponse } from "./types";
import { createAuthHeader, signPayloadSha1 } from "./signing";

interface TcraClientOptions {
  baseUrl?: string;
  timeout?: number;
  token?: string;
  integrationId?: string;
  tokenId?: string;
  testMode?: boolean;
}

export function createTcraClient(opts?: TcraClientOptions) {
  const base = opts?.baseUrl ?? TCRA_BASE_URL;
  const timeout = opts?.timeout ?? 15000;
  const token = opts?.token ?? process.env.TCRA_API_TOKEN;
  const integrationId = opts?.integrationId ?? process.env.TCRA_INTEGRATION_ID;
  const tokenId = opts?.tokenId ?? process.env.TCRA_TOKEN_ID;
  const testMode = opts?.testMode ?? process.env.TCRA_TEST_MODE === "true";

  async function authHeaders(payload: string): Promise<Record<string, string>> {
    // Primary scheme: integration-id + token-id + signature (SHA1withRSA).
    if (integrationId && tokenId) {
      return {
        "integration-id": integrationId,
        "token-id": tokenId,
        signature: await signPayloadSha1(payload),
      };
    }
    // Fallback: JWT bearer (OpenAPI bearerAuth), then legacy RSA signature.
    if (token) return { Authorization: `Bearer ${token}` };
    return { Authorization: await createAuthHeader(payload) };
  }

  async function send(path: string, body: unknown): Promise<Response> {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(await authHeaders(payload)),
    };
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${base}${path}${testMode ? "/test" : ""}`, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  async function pushEvents(events: TcraEventRequest): Promise<TcraEventResponse> {
    const res = await send("/v1/api/events", events);
    if (!res.ok) {
      throw new Error(`TCRA events API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async function pushSnapshot(req: TcraSnapshotRequest): Promise<TcraSnapshotResponse> {
    const res = await send("/v1/api/snapshot", req);
    if (!res.ok) {
      throw new Error(`TCRA snapshot API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  return { pushEvents, pushSnapshot };
}
