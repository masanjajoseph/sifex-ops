import { Session } from 'next-auth';

/**
 * Permission checking utilities for middleware and server components
 */

export const requirePermission = (session: Session | null, permission: string): boolean => {
  if (!session?.user?.permissions) return false;
  return session.user.permissions.includes(permission);
};

export const requireAnyPermission = (
  session: Session | null,
  permissions: string[]
): boolean => {
  if (!session?.user?.permissions) return false;
  return permissions.some((perm) => session.user.permissions.includes(perm));
};

export const requireAllPermissions = (
  session: Session | null,
  permissions: string[]
): boolean => {
  if (!session?.user?.permissions) return false;
  return permissions.every((perm) => session.user.permissions.includes(perm));
};

export const requireRole = (session: Session | null, role: string): boolean => {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(role);
};

export const requireAnyRole = (session: Session | null, roles: string[]): boolean => {
  if (!session?.user?.roles) return false;
  return roles.some((role) => session.user.roles.includes(role));
};

export const requireAllRoles = (session: Session | null, roles: string[]): boolean => {
  if (!session?.user?.roles) return false;
  return roles.every((role) => session.user.roles.includes(role));
};

export const isSuperAdmin = (session: Session | null): boolean => {
  return requireRole(session, 'SUPER_ADMIN');
};

export const isAdmin = (session: Session | null): boolean => {
  return requireAnyRole(session, ['SUPER_ADMIN', 'ADMIN']);
};
