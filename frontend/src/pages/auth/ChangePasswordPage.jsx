import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

/** Inline password-strength checklist */
function StrengthHint({ password }) {
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(password) },
    { label: 'One number',            ok: /\d/.test(password) },
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

function PasswordInput({ label, value, onChange, show, onToggle, placeholder = '••••••••', autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
          <Lock size={16} />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-red-500/20"
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('Password changed successfully!');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full p-6 md:p-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
            <KeyRound size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Change Password</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-400 ml-12">
          Update your account password. You'll need to enter your current password to confirm.
        </p>
      </div>

      {/* Card */}
      <div className="max-w-lg">
        <div className="rounded-2xl p-6 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-none transition-colors duration-200">
          {success ? (
            /* ── Success banner ── */
            <div className="rounded-xl p-4 flex items-start gap-3 mb-0 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <CheckCircle2 size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Password changed successfully!</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Your new password is active. Use it the next time you sign in.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-2 text-xs text-red-700 dark:text-red-400 underline underline-offset-2 hover:text-red-800 dark:hover:text-red-300"
                >
                  Change it again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current password */}
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                show={showCurrent}
                onToggle={() => setShowCurrent(!showCurrent)}
                autoComplete="current-password"
              />

              <div className="border-t border-gray-100 dark:border-zinc-800 pt-5">
                {/* New password */}
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  show={showNew}
                  onToggle={() => setShowNew(!showNew)}
                  autoComplete="new-password"
                />
                <StrengthHint password={newPassword} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border bg-gray-50 pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800
                                ${confirmPassword && newPassword !== confirmPassword
                                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-500'
                                  : 'border-gray-200 focus:border-red-400 focus:ring-red-100 dark:border-zinc-800 dark:focus:border-red-500'
                                }`}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3
                           text-sm font-semibold text-white transition-all"
                style={{
                  background: loading ? '#b91c1c' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  boxShadow: '0 4px 18px rgba(220,38,38,0.3)',
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security tip */}
        <div className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <span className="text-amber-500 text-sm mt-0.5">💡</span>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Use a unique password you don't use anywhere else. Mix uppercase, lowercase, numbers,
            and symbols for the strongest protection.
          </p>
        </div>
      </div>
    </div>
  );
}
