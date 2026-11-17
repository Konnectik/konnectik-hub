import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RouterProvisioningIntervention {
  id: number;
  ap_id: string | null;
  tunnel_ip: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'ignored';
  last_seen_at: string;
}

export function useRouterProvisioningInterventions() {
  return useQuery({
    queryKey: ['router-provisioning-interventions', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('router_provisioning_interventions')
        .select('id,ap_id,tunnel_ip,reason,status,last_seen_at')
        .eq('status', 'open')
        .order('last_seen_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RouterProvisioningIntervention[];
    },
    refetchInterval: 60_000,
  });
}
