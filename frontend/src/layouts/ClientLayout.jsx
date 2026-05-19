/**
 * ClientLayout.jsx — Responsive layout with mobile sidebar support.
 *
 * Desktop : Fixed sidebar (collapsible icon-only).
 * Tablet  : Sidebar collapsed by default; toggle via chevron.
 * Mobile  : Sidebar hidden; hamburger in TopBar slides it in as overlay.
 */

import { useState, useCallback } from 'react';
import { Outlet }     from 'react-router-dom';
import Sidebar        from '../components/navigation/Sidebar';
import TopBar         from '../components/navigation/TopBar';
import FallbackBanner from '../components/common/FallbackBanner';
import { useAuth }    from '../contexts/AuthContext';

export default function ClientLayout() {
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleMobileSidebar = useCallback(() => setMobileSidebarOpen(v => !v), []);
  const closeMobileSidebar  = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="flex h-screen bg-[#f4f6f9] dark:bg-black overflow-hidden transition-colors duration-200">

      {/* ── Mobile backdrop ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────
           Desktop : static, always visible, collapsible.
           Mobile  : absolute overlay, slides in from left.           */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40',
          'lg:static lg:z-50 lg:translate-x-0 overflow-visible',
          'transition-transform duration-300 ease-in-out',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <Sidebar role={user?.role || 'client'} onClose={closeMobileSidebar} />
      </div>

      {/* ── Main column ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative app-bg">
        <FallbackBanner />
        <TopBar onMenuClick={toggleMobileSidebar} />
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 relative z-[1]">
          <div className="animate-fade-in max-w-[1800px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
