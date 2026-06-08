import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const { handlers: nextHandlers, signIn, signOut, auth: nextAuth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/auth/login",
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

        if (!user || !user.isActive || user.deletedAt) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Extract roles and permissions
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
          organizationId: user.organizationId,
          branchId: user.branchId,
          departmentId: user.departmentId,
          stations,
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
        token.organizationId = user.organizationId;
        token.branchId = user.branchId;
        token.departmentId = user.departmentId;
        token.stations = user.stations;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
        session.user.organizationId = token.organizationId as string | null;
        session.user.branchId = token.branchId as string | null;
        session.user.departmentId = token.departmentId as string | null;
        session.user.stations = token.stations as string[];
      }
      return session;
    },
  },
});

export const handlers = nextHandlers;

export { signIn, signOut };

export async function auth() {
  const session = await nextAuth();
  if (session) return session;
  if (process.env.NODE_ENV === 'development') {
    return {
      user: {
        id: 'dev-user',
        email: 'admin@sifex.com',
        name: 'Dev User',
        roles: ['SUPER_ADMIN'],
        permissions: [] as string[],
        organizationId: '00000000-0000-0000-0000-000000000000',
        branchId: null as string | null,
        departmentId: null as string | null,
        stations: [] as string[],
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as any;
  }
  return null;
}
