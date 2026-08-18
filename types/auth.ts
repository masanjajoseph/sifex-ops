import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    branchId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role?: string | null;
      roles: string[];
      permissions: string[];
      branchId: string | null;
      branchIds?: string[];
      departmentId: string | null;
      stations: string[];
      passwordResetRequired: boolean;
      status: string;
      positionName?: string | null;
      recentlyUsed?: string[];
      favorites?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string | null;
    roleId?: string | null;
    workspaceId?: string | null;
    sessionId?: string | null;
    name?: string | null;
    picture?: string | null;
  }
}
