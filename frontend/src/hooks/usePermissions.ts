import { useMemo } from 'react';
import { useAuth } from '@contexts/AuthContext';
import type { UserRole } from '@/types/auth';

/** Role hierarchy — higher index = more privileged. */
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  user: 1,
  engineer: 2,
  maintainer: 3,
  admin: 4,
  owner: 5,
};

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role ?? 'viewer';
    const level = ROLE_HIERARCHY[role] ?? 0;

    return {
      role,
      /** True if user role is at least `requiredRole`. */
      hasRole: (requiredRole: UserRole) =>
        level >= (ROLE_HIERARCHY[requiredRole] ?? 0),
      canRead: level >= ROLE_HIERARCHY.viewer,
      canWrite: level >= ROLE_HIERARCHY.engineer,
      canDelete: level >= ROLE_HIERARCHY.maintainer,
      canAdmin: level >= ROLE_HIERARCHY.admin,
      isOwner: level >= ROLE_HIERARCHY.owner,
    };
  }, [user?.role]);
}
