import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { Bundle } from '@/types/database';

const QUERY_KEY = ['bundles'];

export const useBundles = () => {
  useRealtimeSubscription('bundles', QUERY_KEY);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Bundle[];
    },
  });
};

export const useAddBundle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bundle: { name: string; duration: number; duration_unit: string; price: number; currency: string }) => {
      const { data, error } = await supabase
        .from('bundles')
        .insert(bundle)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};
