import { useLocation } from 'react-router-dom';
import { Bell, Search, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ThemeSwitcher from '../common/ThemeSwitcher';

const breadcrumbMap = {
  '/admin':                 ['Admin', 'Overview'],
  '/admin/clients':         ['Admin', 'Clients'],
  '/admin/users':           ['Admin', 'Users'],
  '/admin/client-settings': ['Admin', 'Settings'],
  '/dashboard':             ['Dashboard'],
};

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const crumbs = breadcrumbMap[pathname]
    || (pathname.startsWith('/dashboard/') ? ['Dashboard', pathname.split('/').pop()] : ['Dashboard']);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="h-14 md:h-[68px] bg-white/90 dark:bg-black/90 backdrop-blur border-b border-slate-100 dark:border-zinc-800 px-3 md:px-6 flex items-center justify-between flex-shrink-0 z-10 transition-colors duration-200">

      <div className="flex items-center gap-2 md:gap-3">
        {/* ── Hamburger (mobile only) ──────────────────────────── */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <nav className="flex items-center gap-1 md:gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1 md:gap-1.5">
              {i > 0 && <ChevronRight size={13} className="text-slate-300 dark:text-zinc-600" />}
              <span className={[
                i === crumbs.length - 1
                  ? 'font-semibold text-slate-800 dark:text-white'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors',
                i > 0 ? 'hidden sm:inline' : '',
              ].join(' ')}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right actions ────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Search — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-slate-400 dark:text-zinc-500 w-44 lg:w-52 hover:border-red-300 dark:hover:border-red-500/50 transition-colors cursor-text">
          <Search size={14} />
          <span className="text-xs">Quick search...</span>
        </div>

        {/* Theme switcher */}
        <ThemeSwitcher />

        {/* Notifications */}
        <button className="relative p-2 md:p-2.5 rounded-xl text-slate-500 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-700 dark:hover:text-white transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-800">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-black" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-0.5">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-700
                          flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/30 flex-shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 dark:text-white leading-tight">{user?.fullName || 'User'}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize leading-tight">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
