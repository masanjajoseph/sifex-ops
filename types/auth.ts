import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    roles: string[];
    permissions: string[];
    branchId: string | null;
    branchIds?: string[];
    departmentId: string | null;
    stations: string[];
    passwordResetRequired: boolean;
    status: string;
    recentlyUsed?: string[];
    favorites?: string[];
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      roles: string[];
      permissions: string[];
      branchId: string | null;
      branchIds?: string[];
      departmentId: string | null;
      stations: string[];
      passwordResetRequired: boolean;
      status: string;
      recentlyUsed?: string[];
      favorites?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    permissions: string[];
    branchId: string | null;
    branchIds?: string[];
    departmentId: string | null;
    stations: string[];
    passwordResetRequired: boolean;
    status: string;
    recentlyUsed?: string[];
    favorites?: string[];
  }
}
