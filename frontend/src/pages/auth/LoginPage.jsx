import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';
import collectiveLogo from '../../assets/collective-logo.png';
import ThemeSwitcher from '../../components/common/ThemeSwitcher';

const portalCopy = {
  admin: {
    title: 'Admin portal',
    subtitle: 'Platform administration, client setup, and access control',
    placeholder: 'admin@collectivercm.com',
    helper: 'Admins can create users, assign client access, and manage platform settings.',
  },
  client: {
    title: 'Client portal',
    subtitle: 'Secure access to assigned client dashboards and analytics',
    placeholder: 'client@yourcompany.com',
    helper: 'Client users only see the dashboards assigned to their account by an admin.',
  },
};

export default function LoginPage() {
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const copy = useMemo(() => portalCopy[portal], [portal]);

  if (isAuthenticated) {
    navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter your email and password.');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { token, user: userData } = res.data.data;
      login(token, userData);
      toast.success(`Welcome back, ${userData.fullName || 'User'}!`);
      navigate(userData.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#f4f6f9] dark:bg-black transition-colors duration-200">
      {/* ══════════════════════════════════════════
          LIGHT COLOUR BLOBS  (3-colour mesh)
          Rose · Ice-blue · Warm-peach
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Rose blob — top-left */}
        <div className="absolute" style={{
          top: '-160px', left: '-160px',
          width: '640px', height: '640px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22,163,74,0.13) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}/>
        {/* Ice-blue blob — top-right */}
        <div className="absolute" style={{
          top: '-80px', right: '-120px',
          width: '560px', height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}/>
        {/* Warm-peach blob — bottom-centre */}
        <div className="absolute" style={{
          bottom: '-200px', left: '30%',
          width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,146,60,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}/>
        {/* Extra soft red — bottom-right */}
        <div className="absolute" style={{
          bottom: '-100px', right: '-100px',
          width: '480px', height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,78,59,0.09) 0%, transparent 70%)',
          filter: 'blur(45px)',
        }}/>
      </div>

      {/* ══════════════════════════════════════════
          FULL-PAGE SVG ILLUSTRATION
          (dark-on-light palette)
      ══════════════════════════════════════════ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ filter: 'blur(2px)' }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(150,150,180,0.18)"/>
          </pattern>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="chipShadow">
            <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(0,0,0,0.08)"/>
          </filter>
        </defs>

        {/* Dot grid */}
        <rect width="1440" height="900" fill="url(#dots)"/>

        {/* ── Concentric rings — left ── */}
        <circle cx="200" cy="460" r="310" fill="none" stroke="rgba(190,18,60,0.07)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="230" fill="none" stroke="rgba(190,18,60,0.09)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="150" fill="none" stroke="rgba(190,18,60,0.08)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="70"  fill="none" stroke="rgba(190,18,60,0.07)"  strokeWidth="1"/>

        {/* ── Concentric rings — right ── */}
        <circle cx="1200" cy="280" r="260" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="185" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="110" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1"/>

        {/* ── Bottom rings ── */}
        <circle cx="850" cy="970" r="300" fill="none" stroke="rgba(251,146,60,0.08)" strokeWidth="1"/>
        <circle cx="850" cy="970" r="220" fill="none" stroke="rgba(251,146,60,0.09)" strokeWidth="1"/>

        {/* ── Full-width ECG heartbeat ── */}
        <polyline
          points="0,540 130,540 165,540 195,458 220,628 248,395 275,668 305,540 430,540 475,540 512,492 538,590 562,512 585,540 720,540 1440,540"
          fill="none" stroke="rgba(190,18,60,0.22)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
        />
        <circle cx="248" cy="395" r="5.5" fill="#C8102E" opacity="0.6" filter="url(#glow)"/>
        <circle cx="275" cy="668" r="4.5" fill="#C8102E" opacity="0.45" filter="url(#glow)"/>
        <circle cx="562" cy="512" r="4"   fill="#C8102E" opacity="0.4"/>

        {/* ── Node network — left ── */}
        <line x1="165" y1="195" x2="355" y2="318" stroke="rgba(190,18,60,0.15)"  strokeWidth="1.2"/>
        <line x1="355" y1="318" x2="545" y2="225" stroke="rgba(190,18,60,0.13)"  strokeWidth="1.2"/>
        <line x1="165" y1="195" x2="90"  y2="355" stroke="rgba(190,18,60,0.11)"  strokeWidth="1"/>
        <line x1="90"  y1="355" x2="355" y2="318" stroke="rgba(190,18,60,0.10)"  strokeWidth="1"/>
        <line x1="355" y1="318" x2="295" y2="690" stroke="rgba(190,18,60,0.10)"  strokeWidth="1"/>
        <line x1="295" y1="690" x2="120" y2="745" stroke="rgba(190,18,60,0.09)"  strokeWidth="1"/>
        <line x1="295" y1="690" x2="465" y2="770" stroke="rgba(190,18,60,0.09)"  strokeWidth="1"/>

        <circle cx="355" cy="318" r="14" fill="white" stroke="rgba(190,18,60,0.35)" strokeWidth="2" filter="url(#glow)"/>
        <circle cx="355" cy="318" r="5.5" fill="#C8102E" opacity="0.7"/>
        <circle cx="165" cy="195" r="10" fill="white" stroke="rgba(190,18,60,0.28)" strokeWidth="1.8"/>
        <circle cx="165" cy="195" r="4"  fill="#C8102E" opacity="0.6"/>
        <circle cx="90"  cy="355" r="8"  fill="white" stroke="rgba(190,18,60,0.22)" strokeWidth="1.5"/>
        <circle cx="90"  cy="355" r="3"  fill="#C8102E" opacity="0.55"/>
        <circle cx="545" cy="225" r="8"  fill="white" stroke="rgba(96,165,250,0.3)" strokeWidth="1.5"/>
        <circle cx="545" cy="225" r="3"  fill="#3b82f6" opacity="0.6"/>
        <circle cx="295" cy="690" r="12" fill="white" stroke="rgba(190,18,60,0.3)" strokeWidth="1.8" filter="url(#glow)"/>
        <circle cx="295" cy="690" r="4.5" fill="#C8102E" opacity="0.65"/>
        <circle cx="120" cy="745" r="6"  fill="white" stroke="rgba(190,18,60,0.2)" strokeWidth="1.2"/>
        <circle cx="120" cy="745" r="2.5" fill="#C8102E" opacity="0.5"/>
        <circle cx="465" cy="770" r="6"  fill="white" stroke="rgba(190,18,60,0.2)" strokeWidth="1.2"/>
        <circle cx="465" cy="770" r="2.5" fill="#C8102E" opacity="0.5"/>

        {/* ── Node network — top-right ── */}
        <line x1="1090" y1="110" x2="1275" y2="215" stroke="rgba(96,165,250,0.18)" strokeWidth="1.2"/>
        <line x1="1275" y1="215" x2="1390" y2="385" stroke="rgba(96,165,250,0.14)" strokeWidth="1"/>
        <line x1="1090" y1="110" x2="1390" y2="385" stroke="rgba(96,165,250,0.10)" strokeWidth="1"/>
        <line x1="1275" y1="215" x2="1195" y2="405" stroke="rgba(96,165,250,0.14)" strokeWidth="1"/>
        <circle cx="1090" cy="110" r="9"  fill="white" stroke="rgba(96,165,250,0.35)" strokeWidth="1.8"/>
        <circle cx="1090" cy="110" r="3.5" fill="#3b82f6" opacity="0.65"/>
        <circle cx="1275" cy="215" r="13" fill="white" stroke="rgba(96,165,250,0.4)"  strokeWidth="2" filter="url(#glow)"/>
        <circle cx="1275" cy="215" r="5"  fill="#3b82f6" opacity="0.75"/>
        <circle cx="1390" cy="385" r="7"  fill="white" stroke="rgba(96,165,250,0.28)" strokeWidth="1.5"/>
        <circle cx="1390" cy="385" r="2.8" fill="#3b82f6" opacity="0.55"/>
        <circle cx="1195" cy="405" r="7"  fill="white" stroke="rgba(96,165,250,0.28)" strokeWidth="1.5"/>
        <circle cx="1195" cy="405" r="2.8" fill="#3b82f6" opacity="0.55"/>

        {/* ── Bar chart — bottom left ── */}
        <g transform="translate(55,655)" opacity="0.55">
          <rect x="0"   y="62" width="22" height="43" rx="4" fill="rgba(190,18,60,0.35)"/>
          <rect x="30"  y="42" width="22" height="63" rx="4" fill="rgba(190,18,60,0.45)"/>
          <rect x="60"  y="18" width="22" height="87" rx="4" fill="rgba(190,18,60,0.6)"/>
          <rect x="90"  y="33" width="22" height="72" rx="4" fill="rgba(190,18,60,0.45)"/>
          <rect x="120" y="8"  width="22" height="97" rx="4" fill="rgba(190,18,60,0.65)"/>
          <rect x="150" y="25" width="22" height="80" rx="4" fill="rgba(190,18,60,0.45)"/>
          <line x1="0" y1="112" x2="180" y2="112" stroke="rgba(100,0,30,0.2)" strokeWidth="1"/>
        </g>

        {/* ── Trend line — top left ── */}
        <g transform="translate(55,75)" opacity="0.4">
          <polyline points="0,68 45,50 90,60 140,28 188,42 238,10 290,22 340,15"
            fill="none" stroke="rgba(190,18,60,0.7)" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="140" cy="28" r="5" fill="#C8102E" opacity="0.85"/>
          <circle cx="238" cy="10" r="5" fill="#C8102E" opacity="0.85"/>
        </g>

      </svg>

      {/* ══════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════ */}
      <div className="relative z-10 flex items-center gap-4 px-10 pt-4">
        <img
          src={collectiveLogo}
          alt="Collective IQ"
          className="h-16 w-auto"
        />
        <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700" />
        <span className="font-bold text-gray-700 dark:text-zinc-200 text-lg tracking-wide">IQ Dashboard</span>
        <div className="ml-auto">
          <ThemeSwitcher />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CENTRED LOGIN CARD
      ══════════════════════════════════════════ */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-6 bg-blue-50/95 border border-blue-200/20 shadow-[0_8px_32px_rgba(190,18,60,0.08),_0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:bg-zinc-950 dark:border-zinc-800 dark:shadow-none transition-colors duration-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sign in</h2>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Choose your portal and enter your credentials</p>
            </div>

            {/* Portal selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setPortal('admin')}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  portal === 'admin'
                    ? 'border-red-500 bg-red-50 shadow-sm dark:bg-red-500/15 dark:border-red-400'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                  <Shield size={16} className="text-red-600 dark:text-red-400" /> Admin
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Manage platform</p>
              </button>
              <button
                type="button"
                onClick={() => setPortal('client')}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  portal === 'client'
                    ? 'border-red-500 bg-red-50 shadow-sm dark:bg-red-500/15 dark:border-red-400'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                  <Building2 size={16} className="text-red-600 dark:text-red-400" /> Client
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">View assigned dashboards</p>
              </button>
            </div>

            {/* Portal info box */}
            <div className="rounded-2xl px-4 py-3 mb-6 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30">
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{copy.title}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{copy.subtitle}</p>
              <p className="text-xs mt-2 text-red-600/75 dark:text-red-400/80">{copy.helper}</p>
            </div>

            {/* Session-expired banner */}
            {sessionExpired && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     className="mt-0.5 shrink-0" stroke="#d97706" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Your session has expired. Please sign in again.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.placeholder}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-red-500/20"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-red-500/20"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all mt-2"
                style={{
                  background: loading ? '#b91c1c' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue to {portal === 'admin' ? 'Admin' : 'Client'} Portal <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-5">
            Secure access — Collective IQ Internal Platform
          </p>
        </div>
      </div>

      <p className="relative z-10 text-center text-xs text-gray-400 dark:text-zinc-500 pb-6">
        © {new Date().getFullYear()} Collective IQ — Internal Use Only
      </p>
    </div>
  );
}