import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute     from './AdminRoute';

import LoginPage            from '../pages/auth/LoginPage';
import ForgotPasswordPage   from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage    from '../pages/auth/ResetPasswordPage';
import ChangePasswordPage   from '../pages/auth/ChangePasswordPage';
import AdminLayout          from '../layouts/AdminLayout';
import ClientLayout         from '../layouts/ClientLayout';
import AdminHomePage        from '../pages/admin/AdminHomePage';
import ClientDirectoryPage  from '../pages/admin/ClientDirectoryPage';
import UserManagementPage   from '../pages/admin/UserManagementPage';
import ClientManagementPage from '../pages/admin/ClientManagementPage';
import DashboardHomePage    from '../pages/dashboard/DashboardHomePage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes ─────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* ── Admin-only routes ──────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"                  element={<AdminHomePage />} />
            <Route path="/admin/clients"          element={<ClientDirectoryPage />} />
            <Route path="/admin/users"            element={<UserManagementPage />} />
            <Route path="/admin/client-settings"  element={<ClientManagementPage />} />
            <Route path="/admin/change-password"  element={<ChangePasswordPage />} />
          </Route>
        </Route>

        {/* ── Authenticated client routes ────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ClientLayout />}>
            <Route path="/dashboard"             element={<DashboardHomePage />} />
            <Route path="/dashboard/:slug"       element={<DashboardHomePage />} />
            <Route path="/change-password"       element={<ChangePasswordPage />} />
          </Route>
        </Route>

        {/* ── Fallback ───────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
