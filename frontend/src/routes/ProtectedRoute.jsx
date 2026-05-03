import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — guards all /dashboard/* paths.
 * Allows any authenticated user (admin, super_admin, client).
 *
 * If a session expires at runtime (token rejected by backend →
 * iq-auth-expired event → AuthContext clears state → sessionExpired=true),
 * always redirects to /login for a clean re-login flow.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, sessionExpired } = useAuth();

  if (sessionExpired)   return <Navigate to="/login" replace />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
