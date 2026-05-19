import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings,
  ChevronLeft, ChevronRight, LogOut, KeyRound, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import collectiveLogo from '../../assets/collective-logo.png';

const adminNav = [
  { to: '/admin',                 icon: LayoutDashboard, label: 'Overview',  end: true },
  { to: '/admin/clients',         icon: Building2,       label: 'Clients' },
  { to: '/admin/users',           icon: Users,           label: 'Users' },
  { to: '/admin/client-settings', icon: Settings,        label: 'Settings' },
];

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  client:      'Client',
};

const LIGHT_BG = 'linear-gradient(180deg, #7f1d1d 0%, #991b1b 55%, #450a0a 100%)';
const DARK_BG  = 'linear-gradient(180deg, #000000 0%, #050505 50%, #000000 100%)';

export default function Sidebar({ role, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isAdminLevel = role === 'admin' || role === 'super_admin';
  const nav = isAdminLevel ? adminNav : clientNav;
  const isDark = theme === 'dark';
  const changePasswordTo = isAdminLevel ? '/admin/change-password' : '/change-password';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  const portalLabel = ROLE_LABELS[role] || 'Portal';

  const borderCls    = isDark ? 'border-zinc-800'   : 'border-white/10';
  const mutedText    = isDark ? 'text-zinc-500'      : 'text-red-200/80';
  const sectionMuted = isDark ? 'text-zinc-600'      : 'text-red-200/60';
  const idleLink     = isDark
    ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
    : 'text-red-100/70 hover:bg-white/10 hover:text-white';
  const activeLink   = isDark
    ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
    : 'bg-white text-red-700 shadow-md shadow-red-900/40';

  return (
    <aside
      className={`
        relative flex flex-col text-white flex-shrink-0 h-full
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[70px]' : 'w-64'}
      `}
      style={{
        background: isDark ? DARK_BG : LIGHT_BG,
        boxShadow: isDark
          ? '4px 0 24px 0 rgba(0,0,0,0.75)'
          : '4px 0 24px 0 rgb(0 0 0 / 0.22)',
        borderRight: isDark ? '1px solid #18181b' : 'none',
        overflow: 'visible',
      }}
    >
      {/* ── Logo + mobile close ───────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b ${borderCls} min-h-[72px] md:min-h-[96px] ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
          <img
            src={collectiveLogo}
            alt="IQ Dashboard logo"
            className="w-10 h-10 md:w-12 md:h-12 object-contain"
            style={{ imageRendering: 'auto', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }}
          />
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">IQ Dashboard</p>
            <p className={`text-xs mt-0.5 ${mutedText}`}>{portalLabel} Portal</p>
          </div>
        )}
        {/* Mobile close button */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Collapse toggle (desktop only) ──────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`hidden lg:flex absolute -right-3 top-16 w-6 h-6 rounded-full items-center justify-center z-50 shadow-md transition-colors duration-150
                   ${isDark
                     ? 'bg-zinc-900 hover:bg-red-600 border border-zinc-700'
                     : 'bg-red-700 hover:bg-red-500 border border-red-500/60'}`}
      >
        {collapsed
          ? <ChevronRight size={12} className="text-white" />
          : <ChevronLeft  size={12} className="text-white" />
        }
      </button>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 ${sectionMuted}`}>
            Navigation
          </p>
        )}
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150
               ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
               ${isActive ? activeLink : idleLink}`
            }
          >
            {({ isActive }) => {
              const iconCls = isActive
                ? (isDark ? 'text-white' : 'text-red-700')
                : (isDark ? 'text-zinc-400' : 'text-red-100/70');
              return (
                <>
                  <Icon size={18} className={iconCls} />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* ── User profile area ───────────────────────────────── */}
      <div className={`border-t ${borderCls} p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            <div
              title={user?.fullName || user?.email}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-700
                         flex items-center justify-center text-xs font-bold text-white shadow cursor-default ring-1 ring-white/30"
            >
              {initials}
            </div>
            <NavLink
              to={changePasswordTo}
              title="Change Password"
              className={({ isActive }) =>
                `w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150
                 ${isActive
                   ? (isDark ? 'bg-red-600 text-white' : 'bg-white text-red-700')
                   : (isDark ? 'text-zinc-500 hover:text-amber-300 hover:bg-zinc-900' : 'text-red-100/60 hover:text-amber-300 hover:bg-white/10')
                 }`
              }
            >
              <KeyRound size={15} />
            </NavLink>
            <button
              onClick={handleLogout}
              title="Logout"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150
                         ${isDark
                           ? 'text-zinc-500 hover:text-white hover:bg-red-600'
                           : 'text-red-100/60 hover:text-white hover:bg-red-500/40'}`}
            >
              <LogOut size={15} />
            </button>
          </>
        ) : (
          <>
            <NavLink
              to={changePasswordTo}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium
                 transition-all duration-150 mb-1
                 ${isActive
                   ? (isDark ? 'bg-red-600 text-white' : 'bg-white text-red-700')
                   : (isDark ? 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900' : 'text-red-100/60 hover:text-amber-300 hover:bg-white/10')
                 }`
              }
            >
              <KeyRound size={14} />
              <span>Change Password</span>
            </NavLink>

            <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-900' : 'hover:bg-white/5'}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-700
                              flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0 ring-1 ring-white/30">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'User'}</p>
                <p className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-red-200/70'}`}>{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className={`p-1.5 rounded-lg transition-all duration-150 flex-shrink-0
                           ${isDark
                             ? 'text-zinc-500 hover:text-white hover:bg-red-600'
                             : 'text-red-100/60 hover:text-white hover:bg-red-500/40'}`}
              >
                <LogOut size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
