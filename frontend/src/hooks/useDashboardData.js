import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';

export function useDashboardSummary(clientId) {
  return useQuery({
    queryKey: ['dashboard', 'summary', clientId],
    queryFn:  () => dashboardApi.getSummary(clientId).then((r) => r.data.data),
    enabled:  Boolean(clientId),
  });
}

export function useDashboardKpis(clientId) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', clientId],
    queryFn:  () => dashboardApi.getKpis(clientId).then((r) => r.data.data),
    enabled:  Boolean(clientId),
  });
}
