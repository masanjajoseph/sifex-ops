import { NextRequest, NextResponse } from "next/server";

interface BatchRequest {
  id: string;
  method: string;
  path: string;
  body?: unknown;
}

interface BatchResponse {
  id: string;
  status: number;
  body: unknown;
}

export async function handleBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
  return Promise.all(
    requests.map(async (req) => {
      try {
        const url = new URL(req.path, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
        const fetchOptions: RequestInit = { method: req.method, headers: { "Content-Type": "application/json" } };
        if (req.body) fetchOptions.body = JSON.stringify(req.body);
        const response = await fetch(url.toString(), fetchOptions);
        const body = await response.json();
        return { id: req.id, status: response.status, body };
      } catch (error) {
        return { id: req.id, status: 500, body: { error: "Internal batch error" } };
      }
    }),
  );
}

export async function POST(req: NextRequest) {
  const { requests } = await req.json();
  if (!Array.isArray(requests) || requests.length > 25) {
    return NextResponse.json({ success: false, error: "Up to 25 batch requests allowed" }, { status: 400 });
  }
  const results = await handleBatch(requests);
  return NextResponse.json({ success: true, results });
}
