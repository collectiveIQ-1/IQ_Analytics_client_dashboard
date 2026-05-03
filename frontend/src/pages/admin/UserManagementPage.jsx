/**
 * UserManagementPage.jsx
 *
 * Role-aware behaviour:
 *
 *   super_admin
 *     • Sees ALL users (including admins)
 *     • Delete button visible on every row
 *     • Can choose Admin or Client when creating a user
 *
 *   admin
 *     • Sees non-super_admin users only (enforced server-side too)
 *     • No delete button
 *     • Can only create Client users (Admin option is hidden)
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Shield, Building2, Check, Trash2, Crown } from 'lucide-react';
import { usersApi } from '../../api/users.api';
import { clientsApi } from '../../api/clients.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'client',
  clientIds: [],
};

/**
 * Badge appearance per role.
 * super_admin → purple/violet
 * admin       → rose/red
 * client      → blue
 */
const ROLE_BADGE = {
  super_admin: {
    cls:   'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    label: 'Super Admin',
  },
  admin: {
    cls:   'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    label: 'Admin',
  },
  client: {
    cls:   'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    label: 'Client',
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [open, setOpen]                   = useState(false);
  const [form, setForm]                   = useState(initialForm);
  const [deleteTarget, setDeleteTarget]   = useState(null); // { id, name } for confirm dialog

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data.data),
  });

  const { data: clients } = useQuery({
    queryKey: ['admin-clients-for-user-create'],
    queryFn: () => clientsApi.getAll().then((r) => r.data.data),
  });

  const sortedClients = useMemo(
    () => [...(clients || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.display_name.localeCompare(b.display_name)
    ),
    [clients]
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createUserMutation = useMutation({
    mutationFn: async (payload) => {
      const { clientIds, ...userPayload } = payload;
      const createdUserRes = await usersApi.create(userPayload);
      const createdUser = createdUserRes.data.data;

      if (userPayload.role === 'client' && clientIds.length > 0) {
        await Promise.all(clientIds.map((clientId) => usersApi.assignClientAccess(createdUser.id, clientId)));
      }

      return createdUser;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(
        variables.role === 'admin'
          ? 'Admin user created successfully.'
          : 'Client user created and access assigned.'
      );
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user.');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user.');
      setDeleteTarget(null);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleClient = (clientId) => {
    setForm((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId)
        ? prev.clientIds.filter((id) => id !== clientId)
        : [...prev.clientIds, clientId],
    }));
  };

  const handleOpen = () => {
    // Admin can only create client users — pre-lock the role
    setForm({ ...initialForm, role: isSuperAdmin ? 'client' : 'client' });
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Please fill in name, email, and password.');
      return;
    }

    if (form.role === 'client' && form.clientIds.length === 0) {
      toast.error('Select at least one client for the client user.');
      return;
    }

    // Guard: admin cannot submit admin role (belt-and-suspenders; backend also enforces)
    if (form.role === 'admin' && !isSuperAdmin) {
      toast.error('You do not have permission to create Admin users.');
      return;
    }

    createUserMutation.mutate({
      full_name: form.full_name.trim(),
      email:     form.email.trim(),
      password:  form.password,
      role:      form.role,
      clientIds: form.role === 'client' ? form.clientIds : [],
    });
  };

  const handleDeleteClick = (u) => {
    setDeleteTarget({ id: u.id, name: u.full_name || u.email });
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteUserMutation.mutate(deleteTarget.id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main shell ─────────────────────────────────────────────────── */}
      <DashboardShell
        title="User Management"
        subtitle={
          isSuperAdmin
            ? 'Full control — create admins and clients, assign access, delete users'
            : 'Create client users and assign dashboard access'
        }
        actions={
          <button onClick={handleOpen} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={15} /> Add User
          </button>
        }
      >
        {isLoading ? (
          <LoadingSpinner text="Loading users..." />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 dark:bg-zinc-900 dark:border-zinc-800">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Last Login', ...(isSuperAdmin ? ['Actions'] : [])].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
                {users?.map((u) => {
                  const badge = ROLE_BADGE[u.role] || {
                    cls:   'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
                    label: u.role,
                  };
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          {u.role === 'super_admin' && (
                            <Crown size={13} className="text-violet-500 dark:text-violet-400 flex-shrink-0" />
                          )}
                          {u.full_name || '—'}
                          {isSelf && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">(you)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={u.is_active ? 'badge-active' : 'badge-placeholder'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-zinc-400">
                        {formatDate(u.last_login_at)}
                      </td>

                      {/* Delete — super_admin only, cannot delete self */}
                      {isSuperAdmin && (
                        <td className="px-5 py-3">
                          {!isSelf ? (
                            <button
                              onClick={() => handleDeleteClick(u)}
                              title={`Delete ${u.full_name || u.email}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-zinc-700 px-2">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardShell>

      {/* ── Add User modal ─────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-red-50 dark:border-zinc-800 dark:from-zinc-900 dark:to-red-950/20">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create new user</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  {isSuperAdmin
                    ? 'Choose Admin or Client, then configure access.'
                    : 'Set up a client user and choose which dashboards they can open.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-colors dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Name + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="user@company.com"
                  />
                </div>
              </div>

              {/* Password + Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label className="label">Role</label>

                  {/* super_admin: can choose admin or client */}
                  {isSuperAdmin ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Admin option — only visible to super_admin */}
                      <button
                        type="button"
                        onClick={() => handleChange('role', 'admin')}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          form.role === 'admin'
                            ? 'border-purple-500 bg-purple-50 shadow-sm dark:bg-purple-500/10 dark:border-purple-400'
                            : 'border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                          <Shield size={16} className="text-purple-600 dark:text-purple-400" /> Admin
                        </div>
                        <p className="text-xs text-slate-500 mt-2 dark:text-zinc-400">Manages clients and users.</p>
                      </button>

                      {/* Client option */}
                      <button
                        type="button"
                        onClick={() => handleChange('role', 'client')}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          form.role === 'client'
                            ? 'border-red-500 bg-red-50 shadow-sm dark:bg-red-500/10 dark:border-red-400'
                            : 'border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                          <Building2 size={16} className="text-red-600 dark:text-red-400" /> Client
                        </div>
                        <p className="text-xs text-slate-500 mt-2 dark:text-zinc-400">Access only assigned dashboards.</p>
                      </button>
                    </div>
                  ) : (
                    /* admin: client-only, displayed as a static info card */
                    <div className="rounded-2xl border border-red-500 bg-red-50 shadow-sm p-4 dark:bg-red-500/10 dark:border-red-400">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                        <Building2 size={16} className="text-red-600 dark:text-red-400" /> Client
                      </div>
                      <p className="text-xs text-slate-500 mt-2 dark:text-zinc-400">
                        Admins can only create Client users.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client access — shown when role === 'client' */}
              {form.role === 'client' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label !mb-0">Client Access</label>
                    <span className="text-xs text-slate-500">Choose one or more clients</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50/70 dark:border-zinc-800 dark:bg-zinc-900/50">
                    {sortedClients.map((client) => {
                      const selected = form.clientIds.includes(client.id);
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => toggleClient(client.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                            selected
                              ? 'border-red-500 bg-red-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-red-500/50 dark:hover:bg-red-500/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                {client.display_name}
                              </p>
                              <p className={`text-xs mt-1 ${selected ? 'text-red-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                                {client.schema_name || 'Dashboard coming soon'}
                              </p>
                            </div>
                            {selected && <Check size={16} className="text-white mt-0.5 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createUserMutation.isPending} className="btn-primary">
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 dark:bg-zinc-950 dark:border-zinc-800">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete user?</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-zinc-200">{deleteTarget.name}</span> will be permanently deleted.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
