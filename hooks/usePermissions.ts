"use client";

import { useSession } from "next-auth/react";
import { hasPermission, hasAnyPermission, hasRole, hasAnyRole, canAccessModule } from "@/lib/permissions";

export function usePermissions() {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === "loading",
    hasRole: (role: string) => hasRole(session, role),
    hasAnyRole: (roles: string[]) => hasAnyRole(session, roles),
    hasPermission: (perm: string) => hasPermission(session, perm),
    hasAnyPermission: (perms: string[]) => hasAnyPermission(session, perms),
    canAccessModule: (perms: string[]) => canAccessModule(session, perms),
    isAuthenticated: !!session?.user,
    user: session?.user,
  };
}
