import { Session } from 'next-auth';

/**
 * Station access validation utilities
 */

export const requireStationAccess = (
  session: Session | null,
  stationId: string
): boolean => {
  if (!session?.user) return false;

  // Super admin bypasses station restrictions
  if (session.user.roles?.includes('SUPER_ADMIN')) return true;

  // Admin bypasses most restrictions except organization isolation
  if (session.user.roles?.includes('ADMIN')) return true;

  // Check if user has access to this station
  if (session.user.stations?.includes(stationId)) return true;

  return false;
};

export const requireStationAccessAny = (
  session: Session | null,
  stationIds: string[]
): boolean => {
  if (!session?.user) return false;

  // Super admin bypasses station restrictions
  if (session.user.roles?.includes('SUPER_ADMIN')) return true;

  // Admin bypasses most restrictions
  if (session.user.roles?.includes('ADMIN')) return true;

  // Check if user has access to any of the stations
  return stationIds.some((stationId) => session.user.stations?.includes(stationId));
};

export const getUserStations = (session: Session | null): string[] => {
  if (!session?.user?.stations) return [];
  return session.user.stations;
};

export const canAccessAllStations = (session: Session | null): boolean => {
  if (!session?.user) return false;

  // Super admin and admin can access all stations
  return session.user.roles?.includes('SUPER_ADMIN') || session.user.roles?.includes('ADMIN') || false;
};
