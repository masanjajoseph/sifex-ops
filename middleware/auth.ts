import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission, requireRole, isSuperAdmin } from './permissions';
import { requireBranchAccess } from './branches';
import { requireStationAccess } from './stations';

/**
 * Route protection middleware
 */

export interface ProtectionConfig {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requiredBranchId?: string;
  requiredStationId?: string;
  requireSuperAdmin?: boolean;
}

export async function protectRoute(
  request: NextRequest,
  config: ProtectionConfig
): Promise<NextResponse | null> {
  const session = await auth();

  // Check authentication
  if (config.requireAuth && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session) {
    return null;
  }

  // Check super admin requirement
  if (config.requireSuperAdmin && !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check permissions
  if (config.requiredPermissions && config.requiredPermissions.length > 0) {
    const hasPermission = config.requiredPermissions.some((perm) =>
      requirePermission(session, perm)
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Check roles
  if (config.requiredRoles && config.requiredRoles.length > 0) {
    const hasRole = config.requiredRoles.some((role) => requireRole(session, role));
    if (!hasRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Check branch access
  if (config.requiredBranchId) {
    if (!requireBranchAccess(session, config.requiredBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Check station access
  if (config.requiredStationId) {
    if (!requireStationAccess(session, config.requiredStationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return null;
}

/**
 * Helper to create protected API route handlers
 */
export function createProtectedHandler(
  config: ProtectionConfig,
  handler: (request: NextRequest, session: any) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const protection = await protectRoute(request, config);
    if (protection) return protection;

    const session = await auth();
    return handler(request, session);
  };
}
