import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WifiZone } from '@/types/database';

export const useWifiZones = () => {
  return useQuery({
    queryKey: ['wifi_zones'],
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
      const { data, error } = await supabase
        .from('wifi_zones')
        .insert(zone)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wifi_zones'] });
    },
  });
};
