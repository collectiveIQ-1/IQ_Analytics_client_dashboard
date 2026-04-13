import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { usersApi } from '../../api/users.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function UserManagementPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.getAll().then((r) => r.data.data),
  });

  return (
    <DashboardShell
      title="User Management"
      subtitle="Manage platform users and their client access"
      actions={
        <button className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={15} /> Add User
        </button>
      }
    >
      {isLoading ? (
        <LoadingSpinner text="Loading users..." />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Last Login'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.full_name || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={u.is_active ? 'badge-active' : 'badge-placeholder'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(u.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
