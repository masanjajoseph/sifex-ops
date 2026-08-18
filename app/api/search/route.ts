import { NextRequest, NextResponse } from "next/server";
import { enterpriseSearch, saveSearchHistory, getRecentSearches } from "@/lib/search";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const entityType = searchParams.get("entityType") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const recent = searchParams.get("recent") === "true";

  if (recent) {
    const searches = await getRecentSearches(session.user.id, limit);
    return NextResponse.json({ searches });
  }

  if (query.length < 2) {
    return NextResponse.json({ results: [], groups: [], total: 0, query, took: 0 });
  }

  const results = await enterpriseSearch({ query, entityType, limit, offset });

  await saveSearchHistory(session.user.id, query, entityType, results.total).catch(() => {});

  return NextResponse.json(results);
}
