import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute     from './AdminRoute';

import LoginPage           from '../pages/auth/LoginPage';
import AdminLayout         from '../layouts/AdminLayout';
import ClientLayout        from '../layouts/ClientLayout';
import AdminHomePage       from '../pages/admin/AdminHomePage';
import ClientDirectoryPage from '../pages/admin/ClientDirectoryPage';
import UserManagementPage  from '../pages/admin/UserManagementPage';
import ClientManagementPage from '../pages/admin/ClientManagementPage';
import DashboardHomePage   from '../pages/dashboard/DashboardHomePage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin-only */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"                element={<AdminHomePage />} />
            <Route path="/admin/clients"        element={<ClientDirectoryPage />} />
            <Route path="/admin/users"          element={<UserManagementPage />} />
            <Route path="/admin/client-settings" element={<ClientManagementPage />} />
          </Route>
        </Route>

        {/* Authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ClientLayout />}>
            <Route path="/dashboard"       element={<DashboardHomePage />} />
            <Route path="/dashboard/:slug" element={<DashboardHomePage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
