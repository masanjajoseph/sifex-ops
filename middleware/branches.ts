import { Session } from 'next-auth';

/**
 * Branch access validation utilities
 */

export const requireBranchAccess = (
  session: Session | null,
  branchId: string
): boolean => {
  if (!session?.user) return false;

  // Super admin bypasses branch restrictions
  if (session.user.roles?.includes('SUPER_ADMIN')) return true;

  // Check if user has access to this branch
  if (session.user.branchId === branchId) return true;

  // Check if user has multi-branch access
  if (session.user.branchIds?.includes(branchId)) return true;

  return false;
};

export const requireBranchAccessAny = (
  session: Session | null,
  branchIds: string[]
): boolean => {
  if (!session?.user) return false;

  // Super admin bypasses branch restrictions
  if (session.user.roles?.includes('SUPER_ADMIN')) return true;

  // Check if user has access to any of the branches
  return branchIds.some(
    (branchId) =>
      session.user.branchId === branchId || session.user.branchIds?.includes(branchId)
  );
};

export const getUserBranches = (session: Session | null): string[] => {
  if (!session?.user) return [];

  const branches = new Set<string>();

  if (session.user.branchId) {
    branches.add(session.user.branchId);
  }

  if (session.user.branchIds) {
    session.user.branchIds.forEach((id) => branches.add(id));
  }

  return Array.from(branches);
};
