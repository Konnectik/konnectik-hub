import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RouterDevice } from '@/types/database';

export const useRouters = () => {
  return useQuery({
    queryKey: ['routers'],
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
      const { data, error } = await supabase
        .from('routers')
        .insert(router)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routers'] });
    },
  });
};
