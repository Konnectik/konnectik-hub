import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { RouterDevice } from '@/types/database';

const QUERY_KEY = ['routers'];

export const useRouters = () => {
  useRealtimeSubscription('routers', QUERY_KEY);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routers')
        .select('*, wifi_zones(id, name, location)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RouterDevice[];
    },
  });
};

export const useAddRouter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (router: { name: string; username: string; password: string; zone_id: string }) => {
      const { data, error } = await supabase.from('routers').insert(router).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useUpdateRouter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<RouterDevice, 'name' | 'username' | 'password' | 'zone_id'>> }) => {
      const { data, error } = await supabase.from('routers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};

export const useDeleteRouter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
};
