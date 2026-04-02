import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { AccessPoint } from '@/types/database';

const QUERY_KEY = ['access_points'];

export const useAccessPoints = () => {
  useRealtimeSubscription('access_points', QUERY_KEY);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_points')
        .select('*, providers(id, business_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccessPoint[];
    },
  });
};

export const useAddAccessPoint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ap: {
      provider_id: string;
      zone_label: string;
      location: string;
      latitude?: number;
      longitude?: number;
      ssid?: string;
      propagation_radius_m: number;
      router_ip?: string;
      router_type?: string;
      speed_profile_name?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase.from('access_points').insert(ap).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useUpdateAccessPoint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AccessPoint> }) => {
      const { data, error } = await supabase.from('access_points').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useDeleteAccessPoint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('access_points').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};
