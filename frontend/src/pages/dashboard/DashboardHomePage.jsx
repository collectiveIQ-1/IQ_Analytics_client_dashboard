import { useParams } from 'react-router-dom';
import { useQuery }  from '@tanstack/react-query';
import { clientsApi } from '../../api/clients.api';
import { useAuth }    from '../../contexts/AuthContext';
import DashboardShell from '../../components/dashboard/DashboardShell';
import ClientCard     from '../../components/dashboard/ClientCard';
import PlaceholderDashboard from '../../components/dashboard/PlaceholderDashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Registry: map slug → specific dashboard component (add more as built)
// For now all route to PlaceholderDashboard — swap per client in Phase 2+
const dashboardRegistry = {
  // 'qfd': lazy(() => import('./clients/QFDDashboard')),
};

export default function DashboardHomePage() {
  const { slug }  = useParams();
  const { user }  = useAuth();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  // If no slug → show client directory grid
  if (!slug) {
    return (
      <DashboardShell
        title={`Welcome, ${user?.fullName || user?.email}`}
        subtitle="Select a client dashboard to view"
      >
        {isLoading ? (
          <LoadingSpinner text="Loading your clients..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clients?.map((c) => <ClientCard key={c.id} client={c} />)}
          </div>
        )}
      </DashboardShell>
    );
  }

  // If slug present → find matching client and render its dashboard
  const client = clients?.find((c) => c.slug === slug);

  if (isLoading) return <LoadingSpinner text="Loading dashboard..." />;

  if (!client) {
    return (
      <DashboardShell title="Client Not Found">
        <p className="text-slate-500 text-sm">No client found for "{slug}".</p>
      </DashboardShell>
    );
  }

  const SpecificDashboard = dashboardRegistry[slug] || null;

  return (
    <DashboardShell title={client.display_name} subtitle={client.schema_name || 'No schema connected yet'}>
      {SpecificDashboard
        ? <SpecificDashboard clientId={client.id} />
        : <PlaceholderDashboard clientName={client.display_name} />
      }
    </DashboardShell>
  );
}
