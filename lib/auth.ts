import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const { handlers: nextHandlers, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
            department: true,
            position: true,
            branch: true,
            userStations: {
              include: {
                station: true,
              },
            },
          },
        });

        if (!user || user.status === "DISABLED" || user.deletedAt) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const roles = user.userRoles.map((ur) => ur.role.code);
        const permissions = user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        );
        const stations = user.userStations.map((us) => us.station.id);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          roles,
          permissions,
          branchId: user.branchId,
          departmentId: user.departmentId,
          stations,
          passwordResetRequired: user.passwordResetRequired,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.branchId = user.branchId;
        token.departmentId = user.departmentId;
        token.stations = user.stations;
        token.passwordResetRequired = user.passwordResetRequired;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
        session.user.branchId = token.branchId as string | null;
        session.user.departmentId = token.departmentId as string | null;
        session.user.stations = token.stations as string[];
        session.user.passwordResetRequired = token.passwordResetRequired as boolean;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
});

export const handlers = nextHandlers;

export { signIn, signOut };

export async function auth() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieString = allCookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const reqHeaders = new Headers({ cookie: cookieString });

    const token = await getToken({
      req: { headers: reqHeaders } as any,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) return null;

    return {
      user: {
        id: (token.id as string) ?? (token.sub as string),
        name: token.name as string,
        email: token.email as string,
        roles: token.roles as string[],
        permissions: token.permissions as string[],
        branchId: token.branchId as string | null,
        departmentId: token.departmentId as string | null,
        stations: token.stations as string[],
        passwordResetRequired: token.passwordResetRequired as boolean,
        status: token.status as string,
      },
      expires: new Date(
        Date.now() + 8 * 60 * 60 * 1000
      ).toISOString(),
    };
  } catch {
    return null;
  }
}
