import https from "node:https";
import { URL } from "node:url";
import { TCRA_BASE_URL, type TcraEventRequest, type TcraEventResponse, type TcraSnapshotRequest, type TcraSnapshotResponse } from "./types";
import { createAuthHeader, signPayloadSha1 } from "./signing";

/**
 * Serialise an event request in the exact field order TCRA expects.
 *
 * TCRA re-serialises every event into its own struct before verifying the RSA
 * signature. Any other order produces `RC02 "NOT VERIFIED"` even though the
 * signature over the transmitted bytes is correct. Outbox payloads live in a
 * Postgres `jsonb` column, which does not preserve key order, so the body has
 * to be rebuilt here — immediately before signing — instead of being sent as
 * it comes back from the database.
 */
export function serializeEventRequest(req: TcraEventRequest): string {
  const eventsList = (req?.eventsList ?? []).map((event) => ({
    msgInfo: {
      timestamp: event.msgInfo.timestamp,
      msgId: event.msgInfo.msgId,
      operationCode: event.msgInfo.operationCode,
      operatorCode: event.msgInfo.operatorCode,
      ...(event.msgInfo.operationType ? { operationType: event.msgInfo.operationType } : {}),
    },
    txnInfo: {
      eventTimestamp: event.txnInfo.eventTimestamp,
      trackingNumber: event.txnInfo.trackingNumber,
      postedBranch: event.txnInfo.postedBranch,
      postedRegion: event.txnInfo.postedRegion,
      destinationBranch: event.txnInfo.destinationBranch,
      destinationRegion: event.txnInfo.destinationRegion,
      locality: event.txnInfo.locality,
      serviceCode: event.txnInfo.serviceCode,
      serviceTypeCode: event.txnInfo.serviceTypeCode,
      status: event.txnInfo.status,
      charges: (event.txnInfo.charges ?? []).map((charge) => ({
        chargeType: charge.chargeType,
        currency: charge.currency,
        amount: charge.amount,
      })),
    },
  }));

  return JSON.stringify({ eventsList });
}

interface TcraClientOptions {
  baseUrl?: string;
  timeout?: number;
  token?: string;
  integrationId?: string;
  tokenId?: string;
  testMode?: boolean;
}

interface TcraHttpResponse {
  status: number;
  statusText: string;
  ok: boolean;
  body: string;
  headers: Record<string, string | string[] | undefined>;
  json: <T>() => T;
}

/**
 * POST a JSON body using Node's https client.
 *
 * The TCRA gateway (196.32.240.66:8443) presents a self-signed certificate
 * whose CN does not match the address, so certificate verification is disabled
 * for this connection only. The request still runs over the established VPN
 * and every body is signed with the TCRA key.
 */
function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
  timeout: number,
): Promise<TcraHttpResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
        timeout,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({
            status,
            statusText: res.statusMessage ?? "",
            ok: status >= 200 && status < 300,
            body: data,
            headers: res.headers,
            json: <T>() => JSON.parse(data) as T,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`TCRA request timed out after ${timeout}ms`));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
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

  async function send(path: string, payload: string): Promise<TcraHttpResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(await authHeaders(payload)),
    };
    if (testMode) {
      // Local dry runs never reach TCRA; the confirmed production path is used
      // for every real request.
      throw new Error("TCRA test mode is enabled; refusing to call the live gateway");
    }
    return postJson(`${base}${path}`, payload, headers, timeout);
  }

  async function pushEvents(events: TcraEventRequest): Promise<TcraEventResponse> {
    const res = await send("/v1/api/events", serializeEventRequest(events));
    if (!res.ok) {
      throw new Error(`TCRA events API error: ${res.status} ${res.statusText} ${res.body.slice(0, 300)}`);
    }
    return res.json<TcraEventResponse>();
  }

  async function pushSnapshot(req: TcraSnapshotRequest): Promise<TcraSnapshotResponse> {
    // The caller builds this request with the field order TCRA expects; do not
    // rebuild it from a database value.
    const res = await send("/v1/api/snapshot", JSON.stringify(req));
    if (!res.ok) {
      throw new Error(`TCRA snapshot API error: ${res.status} ${res.statusText} ${res.body.slice(0, 300)}`);
    }
    return res.json<TcraSnapshotResponse>();
  }

  return { pushEvents, pushSnapshot };
}
