/**
 * DashboardHomePage.jsx
 *
 * /dashboard         → shows the client directory grid (all assigned clients)
 * /dashboard/:slug   → renders the specific client dashboard
 *
 * Navigation: when viewing a specific client (slug present), a back-link appears
 * so the user can return to the dashboard list (or admin overview if they're an admin).
 */

import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery }    from '@tanstack/react-query';
import { ArrowLeft }   from 'lucide-react';
import { clientsApi }  from '../../api/clients.api';
import { useAuth }     from '../../contexts/AuthContext';
import DashboardShell  from '../../components/dashboard/DashboardShell';
import ClientCard      from '../../components/dashboard/ClientCard';
import PlaceholderDashboard from '../../components/dashboard/PlaceholderDashboard';
import LoadingSpinner  from '../../components/common/LoadingSpinner';

/* ─── Dashboard registry ──────────────────────────────────────
 * Maps client slug → specific dashboard component.
 * All existing components currently wrap PlaceholderDashboard —
 * swap them out with real dashboards as each is built.
 * ─────────────────────────────────────────────────────────── */
const dashboardRegistry = {
  'qfd':            lazy(() => import('./clients/QFDDashboard')),
  'tsh':            lazy(() => import('./clients/TSHDashboard')),
  'usneuro':        lazy(() => import('./clients/USNeuroDashboard')),
  'iom-help':       lazy(() => import('./clients/IOMHelpDashboard')),
  'soleil-surgery': lazy(() => import('./clients/SoleilDashboard')),
  'tpc':            lazy(() => import('./clients/TPCDashboard')),
  'confidas':       lazy(() => import('./clients/ConfidasDashboard')),
  'ntos':           lazy(() => import('./clients/NTOSDashboard')),
  'mind-sync':      lazy(() => import('./clients/MindSyncDashboard')),
  'synapses':       lazy(() => import('./clients/SynapsesDashboard')),
  'global-neuro':   lazy(() => import('./clients/GlobalNeuroDashboard')),
  'complete-neuro': lazy(() => import('./clients/CompleteNeuroDashboard')),
  'neuro-watch':    lazy(() => import('./clients/NeuroWatchDashboard')),
  'innervate':      lazy(() => import('./clients/InnervateDashboard')),
};

/* ─── Component ───────────────────────────────────────────── */

export default function DashboardHomePage() {
  const { slug }    = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  /* Fetch clients visible to this user (role-filtered on the backend) */
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll().then((r) => r.data.data),
  });

  /* ── No slug → directory grid ── */
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
            {clients?.map((c, i) => <ClientCard key={c.id} client={c} index={i} />)}
          </div>
        )}
      </DashboardShell>
    );
  }

  /* ── Slug present → render specific client dashboard ── */

  if (isLoading) {
    return (
      <DashboardShell title="Loading…">
        <LoadingSpinner text="Loading dashboard…" />
      </DashboardShell>
    );
  }

  const client = clients?.find((c) => c.slug === slug);

  if (!client) {
    return (
      <DashboardShell title="Client Not Found">
        <div className="space-y-4">
          <p className="text-slate-500 dark:text-zinc-400 text-sm">No client found for "{slug}".</p>
          <BackButton user={user} navigate={navigate} />
        </div>
      </DashboardShell>
    );
  }

  /* Resolve the dashboard component for this slug (fallback to Placeholder) */
  const SpecificDashboard = dashboardRegistry[slug] || null;

  /* Subtitle: always show "All time stats" — schema name is internal, not user-facing */
  const subtitle = 'All time stats';

  return (
    <DashboardShell
      title={client.display_name}
      subtitle={subtitle}
      actions={<BackButton user={user} navigate={navigate} />}
    >
      <Suspense fallback={<LoadingSpinner text="Loading dashboard…" />}>
        {SpecificDashboard
          ? <SpecificDashboard clientId={client.id} />
          : <PlaceholderDashboard clientName={client.display_name} />
        }
      </Suspense>
    </DashboardShell>
  );
}

/* ─── BackButton helper ───────────────────────────────────── */

/**
 * Renders a contextual back-navigation button.
 * Admins are sent to /admin (their overview); clients go to /dashboard (their list).
 */
function BackButton({ user, navigate }) {
  const isAdmin  = user?.role === 'admin' || user?.role === 'super_admin';
  const dest     = isAdmin ? '/admin' : '/dashboard';
  const label    = isAdmin ? 'Back to Admin' : 'All Dashboards';

  return (
    <button
      type="button"
      onClick={() => navigate(dest)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400
                 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg
                 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-100 dark:hover:border-red-500/30"
    >
      <ArrowLeft size={13} />
      {label}
    </button>
  );
}
