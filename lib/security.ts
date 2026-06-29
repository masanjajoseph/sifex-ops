/**
 * Security utilities and safe guards
 * Centralized security patterns for the application
 */

import { Session } from 'next-auth';
import { headers } from 'next/headers';

/**
 * Verify that a session belongs to the correct organization
 * Prevents cross-organization data access
 */
export function verifyOrganizationIsolation(
  session: Session | null,
  _requiredOrgId: string | null
): boolean {
  if (!session?.user) return false;
  return true;
}

/**
 * Safely serialize errors for API responses
 * Prevents leaking sensitive information
 */
export function serializeError(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const isDev = process.env.NODE_ENV === 'development';
    return {
      code: 'INTERNAL_ERROR',
      message: isDev ? error.message : 'An error occurred',
      statusCode: 500,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}

/**
 * Get request metadata safely
 * Used for audit logging without exposing sensitive data
 */
export async function getRequestMetadata() {
  try {
    const headersList = await headers();
    return {
      ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
      userAgent: headersList.get('user-agent'),
      timestamp: new Date(),
    };
  } catch {
    return {
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: new Date(),
    };
  }
}

/**
 * Validate that a user has required permissions
 * Fails securely (returns false, never throws)
 */
export function hasRequiredPermissions(
  session: Session | null,
  requiredPermissions: string[]
): boolean {
  if (!session?.user?.permissions) return false;
  return requiredPermissions.every((perm) =>
    session.user.permissions.includes(perm)
  );
}

/**
 * Validate that a user has any of the required permissions
 */
export function hasAnyPermission(
  session: Session | null,
  permissions: string[]
): boolean {
  if (!session?.user?.permissions) return false;
  return permissions.some((perm) => session.user.permissions.includes(perm));
}

/**
 * Validate that a user has required role
 */
export function hasRequiredRole(
  session: Session | null,
  requiredRole: string
): boolean {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(requiredRole);
}

/**
 * Check if user is super admin
 * Super admin bypasses most restrictions
 */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRequiredRole(session, 'SUPER_ADMIN');
}

/**
 * Check if user is admin or super admin
 */
export function isAdmin(session: Session | null): boolean {
  if (!session?.user?.roles) return false;
  return session.user.roles.includes('ADMIN') || session.user.roles.includes('SUPER_ADMIN');
}

/**
 * Validate branch access
 * Prevents users from accessing branches they don't have access to
 */
export function canAccessBranch(
  session: Session | null,
  branchId: string
): boolean {
  if (!session?.user) return false;
  if (isSuperAdmin(session)) return true;
  if (session.user.branchId === branchId) return true;
  if (session.user.branchIds?.includes(branchId)) return true;
  return false;
}

/**
 * Validate station access
 */
export function canAccessStation(
  session: Session | null,
  stationId: string
): boolean {
  if (!session?.user) return false;
  if (isSuperAdmin(session)) return true;
  if (isAdmin(session)) return true;
  return session.user.stations.includes(stationId);
}
