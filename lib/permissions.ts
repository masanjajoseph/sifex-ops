// Permission and role checking utilities

import { Session } from "next-auth";

export const hasRole = (session: Session | null, role: string): boolean => {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(role);
};

export const hasAnyRole = (session: Session | null, roles: string[]): boolean => {
  if (!session?.user?.roles) return false;
  return roles.some((role) => session.user.roles.includes(role));
};

export const hasAllRoles = (session: Session | null, roles: string[]): boolean => {
  if (!session?.user?.roles) return false;
  return roles.every((role) => session.user.roles.includes(role));
};

export const hasPermission = (session: Session | null, permission: string): boolean => {
  if (!session?.user?.permissions) return false;
  return session.user.permissions.includes(permission);
};

export const hasAnyPermission = (session: Session | null, permissions: string[]): boolean => {
  if (!session?.user?.permissions) return false;
  return permissions.some((perm) => session.user.permissions.includes(perm));
};

export const hasAllPermissions = (session: Session | null, permissions: string[]): boolean => {
  if (!session?.user?.permissions) return false;
  return permissions.every((perm) => session.user.permissions.includes(perm));
};

export const canAccessModule = (session: Session | null, modulePermissions: string[]): boolean => {
  return hasAnyPermission(session, modulePermissions);
};

export const hasStationAccess = (session: Session | null, stationId: string): boolean => {
  if (!session?.user?.stations) return false;
  return session.user.stations.includes(stationId);
};

export const hasBranchAccess = (session: Session | null, branchId: string): boolean => {
  if (!session?.user?.branchId) return false;
  return session.user.branchId === branchId;
};

// Super admin check
export const isSuperAdmin = (session: Session | null): boolean => {
  return hasRole(session, "SUPER_ADMIN");
};

// Admin check (super admin or admin)
export const isAdmin = (session: Session | null): boolean => {
  return hasAnyRole(session, ["SUPER_ADMIN", "ADMIN"]);
};
