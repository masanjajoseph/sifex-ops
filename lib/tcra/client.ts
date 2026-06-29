import { TCRA_BASE_URL, type TcraEventRequest, type TcraEventResponse, type TcraSnapshotRequest, type TcraSnapshotResponse } from "./types";
import { createAuthHeader } from "./signing";

interface TcraClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export function createTcraClient(opts?: TcraClientOptions) {
  const base = opts?.baseUrl ?? TCRA_BASE_URL;
  const timeout = opts?.timeout ?? 15000;

  async function send(path: string, body: unknown): Promise<Response> {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: await createAuthHeader(payload),
    };
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${base}${path}`, {
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
