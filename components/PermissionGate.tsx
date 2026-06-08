"use client";

import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  /** Require ALL permissions/roles instead of ANY */
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasRole, hasAnyRole, session } = usePermissions();

  if (!session) return <>{fallback}</>;

  // Super admin bypasses all gates
  if (hasRole("SUPER_ADMIN")) return <>{children}</>;

  const checks: boolean[] = [];

  if (permission) checks.push(hasPermission(permission));
  if (permissions?.length) {
    checks.push(requireAll ? permissions.every(hasPermission) : hasAnyPermission(permissions));
  }
  if (role) checks.push(hasRole(role));
  if (roles?.length) {
    checks.push(requireAll ? roles.every(hasRole) : hasAnyRole(roles));
  }

  // If no checks specified, allow through
  if (checks.length === 0) return <>{children}</>;

  const allowed = requireAll ? checks.every(Boolean) : checks.some(Boolean);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
