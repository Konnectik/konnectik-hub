import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
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
