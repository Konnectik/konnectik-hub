import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { Transaction } from '@/types/database';

const QUERY_KEY = ['transactions'];

export const useTransactions = () => {
  useRealtimeSubscription('transactions', QUERY_KEY);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });
};
