import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ClientManagementPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  return (
    <DashboardShell
      title="Client Settings"
      subtitle="Manage client registry and schema mappings"
      actions={
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Client
        </button>
      }
    >
      {isLoading ? (
        <LoadingSpinner text="Loading clients..." />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Display Name', 'Slug', 'Schema Name', 'Has Schema', 'Active', 'Sort'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.display_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                  <td className="px-5 py-3 font-mono text-xs text-blue-600">{c.schema_name || '—'}</td>
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
                  <td className="px-5 py-3 text-slate-400">{c.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
