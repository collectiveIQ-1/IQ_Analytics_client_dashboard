import { useQuery } from '@tanstack/react-query';
import { Users, Building2, CheckCircle, Clock } from 'lucide-react';

import { clientsApi } from '../../api/clients.api';
import { usersApi }   from '../../api/users.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import StatCard       from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ClientCard     from '../../components/dashboard/ClientCard';

export default function AdminHomePage() {
  const { data: clients, isLoading: cLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  const { data: users, isLoading: uLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.getAll().then((r) => r.data.data),
  });

  /* Count "live" by is_live flag from DB */
  const liveClients        = clients?.filter((c) =>  c.is_live) ?? [];
  const placeholderClients = clients?.filter((c) => !c.is_live) ?? [];

  return (
    <DashboardShell title="Admin Overview" subtitle="Platform summary and quick access">
      {cLoading || uLoading ? (
        <LoadingSpinner text="Loading platform data..." />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Clients" value={clients?.length ?? 0}     icon={Building2}   color="blue"   />
            <StatCard label="Live Clients"  value={liveClients.length}        icon={CheckCircle} color="green"  />
            <StatCard label="Coming Soon"   value={placeholderClients.length} icon={Clock}       color="amber"  />
            <StatCard label="Total Users"   value={users?.length ?? 0}        icon={Users}       color="purple" />
          </div>

          {/* Client Grid — pass index so colour palette cycles correctly */}
          <div>
            <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-300 mb-3">All Clients</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients?.map((c, i) => <ClientCard key={c.id} client={c} index={i} />)}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
