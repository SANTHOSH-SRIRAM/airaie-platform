import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { usePermissions } from '@hooks/usePermissions';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Minimum role required to access this route. Defaults to any authenticated user. */
  requiredRole?: UserRole;
}

/**
 * ProtectedRoute wraps routes that require authentication.
 * Redirects to /login if the user is not authenticated,
 * preserving the original location so we can redirect back after login.
 * Optionally enforces a minimum role.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const { hasRole } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
