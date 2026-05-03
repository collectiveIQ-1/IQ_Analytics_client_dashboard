import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';
import collectiveLogo from '../../assets/collective-logo.png';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address.');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch {
      // Always show success (never reveal if email exists)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#f4f6f9] dark:bg-black transition-colors duration-200">
      {/* ── Colour blobs ───────────────────────────── */}
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
        <div className="absolute" style={{
          bottom: '-100px', right: '-100px', width: '480px', height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(190,18,60,0.09) 0%, transparent 70%)',
          filter: 'blur(45px)',
        }}/>
      </div>

      {/* ── SVG background illustration ────────────── */}
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
        <rect width="1440" height="900" fill="url(#dots)"/>
        <circle cx="200" cy="460" r="310" fill="none" stroke="rgba(190,18,60,0.07)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="230" fill="none" stroke="rgba(190,18,60,0.09)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="150" fill="none" stroke="rgba(190,18,60,0.08)"  strokeWidth="1"/>
        <circle cx="200" cy="460" r="70"  fill="none" stroke="rgba(190,18,60,0.07)"  strokeWidth="1"/>
        <circle cx="1200" cy="280" r="260" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="185" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="1"/>
        <circle cx="1200" cy="280" r="110" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1"/>
        <polyline
          points="0,540 130,540 165,540 195,458 220,628 248,395 275,668 305,540 430,540 475,540 512,492 538,590 562,512 585,540 720,540 1440,540"
          fill="none" stroke="rgba(190,18,60,0.22)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
        />
        <circle cx="248" cy="395" r="5.5" fill="#C8102E" opacity="0.6" filter="url(#glow)"/>
        <circle cx="275" cy="668" r="4.5" fill="#C8102E" opacity="0.45" filter="url(#glow)"/>
        <line x1="165" y1="195" x2="355" y2="318" stroke="rgba(190,18,60,0.15)" strokeWidth="1.2"/>
        <line x1="355" y1="318" x2="545" y2="225" stroke="rgba(190,18,60,0.13)" strokeWidth="1.2"/>
        <line x1="90"  y1="355" x2="355" y2="318" stroke="rgba(190,18,60,0.10)" strokeWidth="1"/>
        <circle cx="355" cy="318" r="14" fill="white" stroke="rgba(190,18,60,0.35)" strokeWidth="2" filter="url(#glow)"/>
        <circle cx="355" cy="318" r="5.5" fill="#C8102E" opacity="0.7"/>
        <circle cx="1275" cy="215" r="13" fill="white" stroke="rgba(96,165,250,0.4)" strokeWidth="2" filter="url(#glow)"/>
        <circle cx="1275" cy="215" r="5"  fill="#3b82f6" opacity="0.75"/>
        <g transform="translate(155,795)" filter="url(#chipShadow)">
          <rect width="158" height="52" rx="14" fill="white" opacity="0.85" stroke="rgba(251,146,60,0.3)" strokeWidth="1"/>
          <rect x="0" y="0" width="5" height="52" rx="14" fill="#f97316" opacity="0.7"/>
          <text x="16" y="20" fontFamily="Arial,sans-serif" fontSize="9.5" fill="#999" letterSpacing="1">REVENUE CAPTURED</text>
          <text x="16" y="40" fontFamily="Arial,sans-serif" fontSize="18" fontWeight="700" fill="#f97316">$4.2M</text>
        </g>
      </svg>

      {/* ── Top bar ────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-4 px-10 pt-4">
        <img src={collectiveLogo} alt="Collective IQ" className="h-16 w-auto" />
        <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700" />
        <span className="font-bold text-gray-700 dark:text-zinc-200 text-lg tracking-wide">IQ Dashboard</span>
      </div>

      {/* ── Centred card ───────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-6 bg-blue-50/95 border border-blue-200/20 shadow-[0_8px_32px_rgba(190,18,60,0.08),_0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:bg-zinc-950 dark:border-zinc-800 dark:shadow-none transition-colors duration-200">
            {submitted ? (
              /* ── Success state ── */
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <CheckCircle2 size={52} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
                  If an account with <span className="font-semibold text-gray-700">{email}</span> exists,
                  we've sent a password reset link. It expires in 60 minutes.
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-6">
                  Didn't receive it? Check your spam folder, or try again with the correct email.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setSubmitted(false); setEmail(''); }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
                    }}
                  >
                    Try a different email
                  </button>
                  <Link
                    to="/login"
                    className="w-full py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-zinc-300 text-center border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    Back to Sign in
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div className="mb-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors mb-4"
                  >
                    <ArrowLeft size={13} /> Back to Sign in
                  </Link>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Forgot password?</h2>
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
                    Enter your account email and we'll send you a reset link.
                  </p>
                </div>

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
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-red-500/20"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5
                               text-sm font-semibold text-white transition-all"
                    style={{
                      background: loading ? '#b91c1c' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
                      opacity: loading ? 0.85 : 1,
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              </>
            )}
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
