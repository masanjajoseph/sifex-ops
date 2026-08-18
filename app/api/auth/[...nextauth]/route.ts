import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  console.log("[auth:route] GET", { url: req.url });
  const res = await handlers.GET(req);
  console.log("[auth:route] GET response", { status: res.status });
  return res;
}

export async function POST(req: NextRequest) {
  console.log("[auth:route] POST", { url: req.url });
  const res = await handlers.POST(req);
  console.log("[auth:route] POST response", { status: res.status });
  return res;
}
