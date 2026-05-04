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
 *   - Added <FallbackBanner /> above the TopBar so clients immediately see
 *     when the app is running in local fallback mode.
 *   - Switched to the red/rose "login page" theme palette with soft colour
 *     blobs behind the main content and full dark-mode support.
 *   - Added max-w-[1800px] mx-auto wrapper for full-HD layout support.
 *   - Reduced padding from p-6 lg:p-8 to p-4 lg:p-6 for more chart space.
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
      <Sidebar role={user?.role || 'client'} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative app-bg">
        <FallbackBanner />
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative z-[1]">
          <div className="animate-fade-in max-w-[1800px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
