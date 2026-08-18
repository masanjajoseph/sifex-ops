import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[api/me] start");

  const session = await auth();
  if (!session?.user?.id) {
    console.log("[api/me] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;

  try {
    const [dbUser, roles, stations] = await Promise.all([
      prisma.user.findUnique({
        where: { id: uid },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          branchId: true,
          departmentId: true,
          status: true,
          position: { select: { name: true } },
        },
      }),
      prisma.userRole.findMany({
        where: { userId: uid },
        select: {
          role: {
            select: {
              code: true,
              rolePermissions: {
                select: {
                  permission: { select: { code: true } },
                },
              },
            },
          },
        },
      }),
      prisma.userStation.findMany({
        where: { userId: uid },
        select: { stationId: true },
      }),
    ]);

    if (!dbUser) {
      console.log("[api/me] user not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roleCodes = roles.map((r) => r.role.code);
    const permissionCodes = [
      ...new Set(
        roles.flatMap((r) =>
          r.role.rolePermissions.map((rp) => rp.permission.code)
        )
      ),
    ];

    console.log("[api/me] success", { uid, roles: roleCodes.length, permissions: permissionCodes.length });

    return NextResponse.json({
      id: uid,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      name: `${dbUser.firstName} ${dbUser.lastName}`,
      avatar: dbUser.avatar,
      branchId: dbUser.branchId,
      departmentId: dbUser.departmentId,
      status: dbUser.status,
      position: dbUser.position?.name ?? null,
      roles: roleCodes,
      permissions: permissionCodes,
      stations: stations.map((s) => s.stationId),
    });
  } catch (err) {
    console.log("[api/me] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}