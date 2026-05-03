/**
 * ClientManagementPage.jsx
 * Admin view: list all clients + Add Client modal.
 *
 * Role-aware behaviour:
 *   super_admin → sees delete button on each client row
 *   admin       → no delete button (backend enforces this too)
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Database, Link, Trash2, Zap } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────── */

const initialForm = {
  display_name: '',
  slug:         '',
  schema_name:  '',
  has_schema:   false,
  description:  '',
  sort_order:   '',
};

/** Convert display_name to a slug-safe string automatically */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ─── component ───────────────────────────────────────────── */

export default function ClientManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [open,         setOpen]         = useState(false);
  const [form,         setForm]         = useState(initialForm);
  const [slugTouched,  setSlugTouched]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  /* ── data fetch ── */
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  /* ── create mutation ── */
  const createMutation = useMutation({
    mutationFn: (payload) => clientsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client added successfully.');
      handleClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create client.');
    },
  });

  /* ── live toggle mutation (super_admin only) ── */
  const liveMutation = useMutation({
    mutationFn: ({ id, is_live }) => clientsApi.update(id, { is_live }),
    onSuccess: (_, { is_live }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(is_live ? 'Client marked as Live.' : 'Client set to Coming Soon.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update client status.');
    },
  });

  /* ── delete mutation ── */
  const deleteMutation = useMutation({
    mutationFn: (id) => clientsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted.');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete client.');
      setDeleteTarget(null);
    },
  });

  /* ── form helpers ── */
  const handleOpen = () => {
    setForm(initialForm);
    setSlugTouched(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(initialForm);
    setSlugTouched(false);
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-populate slug from display_name unless the user has manually edited it
      if (field === 'display_name' && !slugTouched) {
        next.slug = toSlug(value);
      }

      // If schema name is cleared, unset has_schema automatically
      if (field === 'schema_name' && value.trim() === '') {
        next.has_schema = false;
      }
      // If schema name is set, mark has_schema true automatically
      if (field === 'schema_name' && value.trim() !== '') {
        next.has_schema = true;
      }

      return next;
    });
  };

  const handleSlugChange = (value) => {
    // Sanitise: only lowercase letters, numbers and hyphens
    const sanitised = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: sanitised }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.display_name.trim()) return toast.error('Display name is required.');
    if (!form.slug.trim())         return toast.error('Slug is required.');

    const payload = {
      display_name: form.display_name.trim(),
      slug:         form.slug.trim(),
      schema_name:  form.schema_name.trim() || null,
      has_schema:   Boolean(form.has_schema),
      description:  form.description.trim() || null,
      sort_order:   form.sort_order !== '' ? parseInt(form.sort_order, 10) : 0,
    };

    createMutation.mutate(payload);
  };

  /* ── render ── */
  const tableHeaders = ['Display Name', 'Slug', 'Schema Name', 'Has Schema', 'Active', 'Sort'];
  if (isSuperAdmin) tableHeaders.push('Live Status', 'Actions');

  return (
    <>
      {/* ── Page ── */}
      <DashboardShell
        title="Client Settings"
        subtitle={
          isSuperAdmin
            ? 'Manage client registry, schema mappings, and delete clients'
            : 'Manage client registry and schema mappings'
        }
        actions={
          <button onClick={handleOpen} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Client
          </button>
        }
      >
        {isLoading ? (
          <LoadingSpinner text="Loading clients..." />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 dark:bg-zinc-900 dark:border-zinc-800">
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
                {clients?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{c.display_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-zinc-400">{c.slug}</td>
                    <td className="px-5 py-3 font-mono text-xs text-red-600 dark:text-red-400">{c.schema_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={c.has_schema ? 'badge-active' : 'badge-placeholder'}>
                        {c.has_schema ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={c.is_active ? 'badge-active' : 'badge-placeholder'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 dark:text-zinc-500">{c.sort_order}</td>

                    {/* Live toggle + Delete — super_admin only */}
                    {isSuperAdmin && (
                      <>
                        {/* Live Status toggle */}
                        <td className="px-5 py-3">
                          <button
                            onClick={() => liveMutation.mutate({ id: c.id, is_live: !c.is_live })}
                            disabled={liveMutation.isPending}
                            title={c.is_live ? 'Switch to Coming Soon' : 'Switch to Live'}
                            className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                              c.is_live
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                            }`}
                          >
                            {/* Toggle pill */}
                            <span className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                              c.is_live ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'
                            }`}>
                              <span className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform ${
                                c.is_live ? 'translate-x-3' : 'translate-x-0'
                              }`} />
                            </span>
                            {c.is_live ? (
                              <><Zap size={11} /> Live</>
                            ) : (
                              'Coming Soon'
                            )}
                          </button>
                        </td>

                        {/* Delete */}
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setDeleteTarget({ id: c.id, name: c.display_name })}
                            title={`Delete ${c.display_name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardShell>

      {/* ── Add Client Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-red-50 dark:border-zinc-800 dark:from-zinc-900 dark:to-red-950/20">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Client</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Fill in the details below. Schema mapping is optional — leave blank for clients without data yet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Display name + Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Name <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    value={form.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    placeholder="e.g. Acme Neuro"
                    required
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Link size={11} /> Slug <span className="text-red-500">*</span>
                    <span className="ml-auto font-normal normal-case text-slate-400 tracking-normal">auto-generated</span>
                  </label>
                  <input
                    className="input font-mono text-xs"
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="acme-neuro"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers and hyphens only.</p>
                </div>
              </div>

              {/* Schema name */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Database size={11} /> Schema Name
                  <span className="ml-auto font-normal normal-case text-slate-400 tracking-normal">optional</span>
                </label>
                <input
                  className="input font-mono text-xs"
                  value={form.schema_name}
                  onChange={(e) => handleChange('schema_name', e.target.value)}
                  placeholder="iq_acme  (leave blank if no schema yet)"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty for clients without a live data schema. Has Schema will be set automatically.
                </p>
              </div>

              {/* Schema indicator (read-only derived field) */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wide">Has Schema</span>
                <span className={`ml-auto ${form.has_schema ? 'badge-active' : 'badge-placeholder'}`}>
                  {form.has_schema ? 'Yes — schema mapped' : 'No — no schema yet'}
                </span>
              </div>

              {/* Description + Sort order */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <input
                    className="input"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Short description for this client"
                  />
                </div>
                <div>
                  <label className="label">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={form.sort_order}
                    onChange={(e) => handleChange('sort_order', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 dark:bg-zinc-950 dark:border-zinc-800">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete client?</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-zinc-200">{deleteTarget.name}</span> will be permanently deleted,
                  including all user access assignments. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
