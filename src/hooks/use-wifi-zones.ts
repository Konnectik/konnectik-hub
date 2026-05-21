import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { WifiZone } from '@/types/database';

const QUERY_KEY = ['wifi_zones'];

export const useWifiZones = () => {
  useRealtimeSubscription('wifi_zones', QUERY_KEY);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wifi_zones')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WifiZone[];
    },
  });
};

export const useAddWifiZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: { name: string; location: string; radius: number; bandwidth: number; owner_id?: string }) => {
      const { data, error } = await supabase.from('wifi_zones').insert(zone).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useUpdateWifiZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<WifiZone, 'name' | 'location' | 'radius' | 'bandwidth'>> }) => {
      const { data, error } = await supabase.from('wifi_zones').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useDeleteWifiZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wifi_zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};
