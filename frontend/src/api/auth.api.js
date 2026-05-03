import api from './axiosInstance';

export const authApi = {
  // ── Existing ─────────────────────────────────────────────────────────────
  login:  (email, password) => api.post('/auth/login', { email, password }),
  me:     ()                => api.get('/auth/me'),

  // ── Password management ──────────────────────────────────────────────────
  /** Change password for the currently logged-in user. */
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword, confirmPassword }),

  /** Request a password-reset email. Always resolves (never reveals if email exists). */
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  /** Validate a raw reset token before showing the new-password form. */
  validateResetToken: (token) =>
    api.get('/auth/reset-password/validate', { params: { token } }),

  /** Submit new password together with the raw reset token. */
  resetPassword: (token, newPassword, confirmPassword) =>
    api.post('/auth/reset-password', { token, newPassword, confirmPassword }),
};
