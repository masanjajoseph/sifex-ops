import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/features/auth/permissions.service";

export async function GET() {
  const { error } = await requirePermission("roles.view");
  if (error) return error;

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
  });

  const grouped = permissions.reduce(
    (acc, p) => {
      const module = p.module;
      if (!acc[module]) acc[module] = [];
      acc[module].push({ id: p.id, code: p.code, name: p.name, description: p.description });
      return acc;
    },
    {} as Record<string, Array<{ id: string; code: string; name: string; description: string | null }>>,
  );

  return NextResponse.json({ permissions, grouped });
}
