/**
 * AdminLayout.jsx
 *
 * Changes:
 *   • Reads the logged-in user's role from AuthContext and passes it to
 *     <Sidebar> so that super_admin gets the correct portal label and nav.
 *   • Added <FallbackBanner /> so admins see when the app is in local fallback mode.
 */

import { Outlet }        from 'react-router-dom';
import Sidebar           from '../components/navigation/Sidebar';
import TopBar            from '../components/navigation/TopBar';
import FallbackBanner    from '../components/common/FallbackBanner';
import { useAuth }       from '../contexts/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();

  // Default to 'admin' if context is not yet hydrated
  const role = user?.role || 'admin';

  return (
    <div className="flex h-screen bg-[#f4f6f9] dark:bg-black overflow-hidden transition-colors duration-200">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative app-bg">
        {/* Amber banner — visible only when backend is in local fallback mode */}
        <FallbackBanner />
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-[1]">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
