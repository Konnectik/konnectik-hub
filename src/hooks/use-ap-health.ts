import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AccessPoint, ApHealthLog } from '@/types/database';

export interface ApWithHealth extends AccessPoint {
  latest_health?: ApHealthLog;
}

export function useAccessPointsWithHealth() {
  return useQuery({
    queryKey: ['access-points-health'],
    queryFn: async (): Promise<ApWithHealth[]> => {
      const { data: aps, error: apError } = await supabase
        .from('access_points')
        .select('*, providers(business_name)')
        .order('zone_label');

      if (apError) throw apError;
      if (!aps?.length) return [];

      // Get latest health log per AP
      const apIds = aps.map((ap) => ap.id);
      const { data: healthLogs, error: hlError } = await supabase
        .from('ap_health_log')
        .select('*')
        .in('ap_id', apIds)
        .order('checked_at', { ascending: false });

      if (hlError) throw hlError;

      // Map latest health per AP
      const latestByAp = new Map<string, ApHealthLog>();
      for (const log of healthLogs ?? []) {
        if (!latestByAp.has(log.ap_id)) {
          latestByAp.set(log.ap_id, log as ApHealthLog);
        }
      }

      return aps.map((ap) => ({
        ...ap,
        latest_health: latestByAp.get(ap.id),
      })) as ApWithHealth[];
    },
    refetchInterval: 30_000,
  });
}

export function useApHealthHistory(apId: string | null) {
  return useQuery({
    queryKey: ['ap-health-history', apId],
    queryFn: async (): Promise<ApHealthLog[]> => {
      if (!apId) return [];
      const { data, error } = await supabase
        .from('ap_health_log')
        .select('*')
        .eq('ap_id', apId)
        .order('checked_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as ApHealthLog[];
    },
    enabled: !!apId,
  });
}
