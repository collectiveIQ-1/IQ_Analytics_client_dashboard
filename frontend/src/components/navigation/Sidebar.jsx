import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Settings, Activity, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const adminNav = [
  { to: '/admin',                icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/clients',        icon: Building2,       label: 'Clients' },
  { to: '/admin/users',          icon: Users,            label: 'Users' },
  { to: '/admin/client-settings',icon: Settings,         label: 'Settings' },
];

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function Sidebar({ role }) {
  const { user } = useAuth();
  const nav = role === 'admin' ? adminNav : clientNav;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">IQ Dashboard</p>
            <p className="text-xs text-slate-400 capitalize">{role} Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.fullName || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
