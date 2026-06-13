import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DashboardStatsScope = 'admin' | 'provider' | 'user' | 'anonymous';

export interface DashboardStats {
  /**
   * Tells the UI which subset of fields is meaningful. The RPC returns zeros
   * for fields that are not in scope, but components should still avoid
   * rendering admin-only widgets (platform revenue, total users) when
   * scope !== 'admin' to keep the UX coherent.
   */
  scope: DashboardStatsScope;
  provider_id?: string;
  total_users: number;
  active_bundles: number;
  active_sessions: number;
  total_gmv_xaf: number;
  platform_revenue_xaf: number;
  total_providers: number;
  total_access_points: number;
  online_access_points: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      // The RPC returns an array with one row
      const row = Array.isArray(data) ? data[0] : data;
      return row as DashboardStats;
    },
    refetchInterval: 30_000, // refresh every 30s
  });
};
