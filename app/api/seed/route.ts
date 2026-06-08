import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { execSync } = await import("child_process");
    const result = execSync("npx tsx scripts/seed.ts", {
      encoding: "utf-8",
      env: { ...process.env },
      timeout: 30_000,
    });

    return NextResponse.json({
      success: true,
      message: "Seed completed",
      output: result.split("\n").filter(Boolean).slice(-5),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
