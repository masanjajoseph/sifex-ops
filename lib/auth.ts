import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const {
  handlers: nextHandlers,
  signIn,
  signOut,
  auth: nextAuthAuth,
} = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
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
        if (!validated.success) {
          console.log("[auth] authorize: invalid credentials schema");
          return null;
        }

        const { email, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            password: true,
            status: true,
            deletedAt: true,
            branchId: true,
            userRoles: {
              select: {
                role: { select: { code: true } },
              },
              take: 1,
            },
          },
        });

        if (!user || user.status === "DISABLED" || user.deletedAt) {
          console.log("[auth] authorize: user not found or disabled", email);
          return null;
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
          console.log("[auth] authorize: invalid password", email);
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        console.log("[auth] authorize: success", user.id);

        return {
          id: user.id,
          email,
          role: user.userRoles[0]?.role.code ?? null,
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log("[auth] jwt callback start", { hasUser: !!user, trigger });

      if (user) {
        token.email = user.email;
        token.roleId = user.role;
        token.workspaceId = user.branchId;
        token.sessionId = crypto.randomUUID();
      }

      if (trigger === "update") {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { email: true },
        });
        if (fresh) token.email = fresh.email;
      }

      console.log("[auth] jwt callback end");
      return token;
    },
    async session({ session, token }) {
      console.log("[auth] session callback start", { uid: token.sub });

      if (token) {
        session.user.id = token.sub as string;
        session.user.email = (token.email as string) ?? "";
        session.user.role = (token.roleId as string) ?? null;

        // Load display name + avatar from DB (single query, no relationships)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          });
          if (dbUser) {
            session.user.name = `${dbUser.firstName} ${dbUser.lastName}`;
            session.user.image = dbUser.avatar;
          } else {
            session.user.name = "";
            session.user.image = null;
          }
        } catch (err) {
          console.log("[auth] session: DB query failed", err);
          session.user.name = "";
          session.user.image = null;
        }

        try {
          const dbUserFull = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              branchId: true,
              departmentId: true,
              status: true,
              passwordResetRequired: true,
              position: { select: { name: true } },
              userRoles: {
                select: {
                  role: {
                    select: {
                      code: true,
                      rolePermissions: { select: { permission: { select: { code: true } } } },
                    },
                  },
                },
              },
              userStations: { select: { stationId: true } },
            },
          });
          if (dbUserFull) {
            session.user.roles = dbUserFull.userRoles.map(ur => ur.role.code);
            const permSet = new Set<string>();
            for (const ur of dbUserFull.userRoles) {
              for (const rp of ur.role.rolePermissions) {
                permSet.add(rp.permission.code);
              }
            }
            session.user.permissions = Array.from(permSet);
            session.user.stations = dbUserFull.userStations.map(us => us.stationId);
            session.user.branchId = dbUserFull.branchId;
            session.user.departmentId = dbUserFull.departmentId;
            session.user.status = dbUserFull.status;
            session.user.passwordResetRequired = dbUserFull.passwordResetRequired;
            session.user.positionName = dbUserFull.position?.name ?? null;
          }
        } catch (err) {
          console.log("[auth] session: permission query failed", err);
          session.user.roles = [];
          session.user.permissions = [];
          session.user.stations = [];
          session.user.branchId = null;
          session.user.departmentId = null;
          session.user.status = "ACTIVE";
          session.user.passwordResetRequired = false;
          session.user.positionName = null;
        }
      }

      console.log("[auth] session callback end");
      return session;
    },
  },
});

export const handlers = nextHandlers;
export { signIn, signOut };

export async function auth(): Promise<Session | null> {
  return (await nextAuthAuth()) as Session | null;
}
