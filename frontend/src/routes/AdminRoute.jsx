import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminRoute — guards all /admin/* paths.
 * Permits: admin, super_admin.
 * Blocks: client → /dashboard, unauthenticated → /login.
 *
 * sessionExpired always forces a redirect to /login regardless of role,
 * giving the user a clean re-login flow instead of a broken page.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdminOrAbove, sessionExpired } = useAuth();

  // Expired session always redirects first
  if (sessionExpired)    return <Navigate to="/login"     replace />;

  if (!isAuthenticated)  return <Navigate to="/login"     replace />;

  if (!isAdminOrAbove)   return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
