/**
 * ClientLayout.jsx
 *
 * Layout for /dashboard and /dashboard/:slug.
 * The sidebar role is driven by the ACTUAL logged-in user's role, not a hard-coded
 * string. This means an admin who navigates to a client dashboard (e.g. by clicking
 * a ClientCard on the overview page) will still see the admin sidebar and can
 * navigate back without losing their admin context.
 *
 * Changes from the original:
 *   • Added <FallbackBanner /> above the TopBar so clients immediately see
 *     when the app is running in local fallback mode.
 *   • Switched to the red/rose "login page" theme palette with soft colour
 *     blobs behind the main content and full dark-mode support.
 */

import { Outlet }     from 'react-router-dom';
import Sidebar        from '../components/navigation/Sidebar';
import TopBar         from '../components/navigation/TopBar';
import FallbackBanner from '../components/common/FallbackBanner';
import { useAuth }    from '../contexts/AuthContext';

export default function ClientLayout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#f4f6f9] dark:bg-black overflow-hidden transition-colors duration-200">
      {/* Pass the user's real role so admins keep their admin nav */}
      <Sidebar role={user?.role || 'client'} />
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
