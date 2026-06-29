import { NextRequest, NextResponse } from "next/server";
import { handleBatch } from "@/lib/batch";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { requests } = await req.json();
    if (!Array.isArray(requests) || requests.length > 25) {
      return NextResponse.json(
        { success: false, error: "Up to 25 batch requests allowed" },
        { status: 400 },
      );
    }
    const results = await handleBatch(requests);
    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid batch request" }, { status: 400 });
  }
}
