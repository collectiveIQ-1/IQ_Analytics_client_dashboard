import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * SuperAdminRoute — guards routes that require super_admin exclusively.
 * Allows:  super_admin
 * Blocks:  admin       → /admin
 *          client      → /dashboard
 *          unauthed    → /login
 */
export default function SuperAdminRoute() {
  const { isAuthenticated, isSuperAdmin, isAdminOrAbove, sessionExpired } = useAuth();

  if (sessionExpired)   return <Navigate to="/login"     replace />;
  if (!isAuthenticated) return <Navigate to="/login"     replace />;

  if (!isSuperAdmin)    return <Navigate to={isAdminOrAbove ? '/admin' : '/dashboard'} replace />;

  return <Outlet />;
}
