import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients.api';
import DashboardShell from '../../components/dashboard/DashboardShell';
import ClientCard     from '../../components/dashboard/ClientCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ClientDirectoryPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  return (
    <DashboardShell title="Client Directory" subtitle="All clients on the IQ Dashboard platform">
      {isLoading ? (
        <LoadingSpinner text="Loading clients..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients?.map((c, i) => <ClientCard key={c.id} client={c} index={i} />)}
        </div>
      )}
    </DashboardShell>
  );
}
