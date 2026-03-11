import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Bundle } from '@/types/database';

export const useBundles = () => {
  return useQuery({
    queryKey: ['bundles'],
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
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
    },
  });
};
