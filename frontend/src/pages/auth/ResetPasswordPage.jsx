import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';
import collectiveLogo from '../../assets/collective-logo.png';

/** Minimal password-strength rules shown inline */
function StrengthHint({ password }) {
  const rules = [
    { label: 'At least 8 characters',    ok: password.length >= 8 },
    { label: 'One uppercase letter',      ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',      ok: /[a-z]/.test(password) },
    { label: 'One number',                ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {rules.map(({ label, ok }) => (
        <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-zinc-500'}`}>
          {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function ResetPasswordPage() {
  const [searchParams]            = useSearchParams();
  const navigate                  = useNavigate();
  const token                     = searchParams.get('token') || '';

  const [validating, setValidating]   = useState(true);
  const [tokenValid, setTokenValid]   = useState(false);
  const [tokenError, setTokenError]   = useState('');

  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [success, setSuccess]               = useState(false);

  /* Validate token on mount */
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token found. Please request a new password reset link.');
      setValidating(false);
      return;
    }
    authApi.validateResetToken(token)
      .then(() => { setTokenValid(true); })
      .catch((err) => {
        const msg = err.response?.data?.message || 'This reset link is invalid or has expired.';
        setTokenError(msg);
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared wrapper (background + card) ── */
  const Wrapper = ({ children }) => (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#f4f6f9] dark:bg-black transition-colors duration-200">
      {/* Colour blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute" style={{
          top: '-160px', left: '-160px', width: '640px', height: '640px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.13) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}/>
        <div className="absolute" style={{
          top: '-80px', right: '-120px', width: '560px', height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}/>
        <div className="absolute" style={{
          bottom: '-200px', left: '30%', width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,146,60,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}/>
      </div>

      {/* SVG illustration */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ filter: 'blur(2px)' }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dots2" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(150,150,180,0.18)"/>
          </pattern>
          <filter id="glow2" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1440" height="900" fill="url(#dots2)"/>
        <circle cx="200" cy="460" r="310" fill="none" stroke="rgba(190,18,60,0.07)" strokeWidth="1"/>
        <circle cx="200" cy="460" r="230" fill="none" stroke="rgba(190,18,60,0.09)" strokeWidth="1"/>
        <circle cx="200" cy="460" r="150" fill="none" stroke="rgba(190,18,60,0.08)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="260" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="185" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="1"/>
        <polyline
          points="0,540 130,540 165,540 195,458 220,628 248,395 275,668 305,540 430,540 475,540 512,492 538,590 562,512 585,540 720,540 1440,540"
          fill="none" stroke="rgba(190,18,60,0.22)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow2)"
        />
        <circle cx="248" cy="395" r="5.5" fill="#C8102E" opacity="0.6" filter="url(#glow2)"/>
      </svg>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-4 px-10 pt-4">
        <img src={collectiveLogo} alt="Collective IQ" className="h-16 w-auto" />
        <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700" />
        <span className="font-bold text-gray-700 dark:text-zinc-200 text-lg tracking-wide">IQ Dashboard</span>
      </div>

      {/* Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-6 bg-blue-50/95 border border-blue-200/20 shadow-[0_8px_32px_rgba(190,18,60,0.08),_0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:bg-zinc-950 dark:border-zinc-800 dark:shadow-none transition-colors duration-200">
            {children}
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

  /* ── Loading state ── */
  if (validating) {
    return (
      <Wrapper>
        <div className="text-center py-8">
          <span className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin inline-block" />
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-4">Validating reset link…</p>
        </div>
      </Wrapper>
    );
  }

  /* ── Invalid token ── */
  if (!tokenValid) {
    return (
      <Wrapper>
        <div className="text-center py-4">
          <XCircle size={52} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Link expired</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{tokenError}</p>
          <Link
            to="/forgot-password"
            className="w-full inline-block py-3 rounded-xl text-sm font-semibold text-white text-center transition-all"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
            }}
          >
            Request a new link
          </Link>
          <Link
            to="/login"
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5
                       text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Sign in
          </Link>
        </div>
      </Wrapper>
    );
  }

  /* ── Success ── */
  if (success) {
    return (
      <Wrapper>
        <div className="text-center py-4">
          <CheckCircle2 size={52} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Password updated!</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
            }}
          >
            Sign in
          </button>
        </div>
      </Wrapper>
    );
  }

  /* ── Reset form ── */
  return (
    <Wrapper>
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to Sign in
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Set new password</h2>
        <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
              <Lock size={16} />
            </div>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-red-500/20"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <StrengthHint password={newPassword} />
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
              <Lock size={16} />
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-xl border bg-gray-50 pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800
                          ${confirmPassword && newPassword !== confirmPassword
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-red-400 focus:ring-red-100'
                          }`}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5
                     text-sm font-semibold text-white transition-all mt-2"
          style={{
            background: loading ? '#b91c1c' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Updating password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </Wrapper>
  );
}
