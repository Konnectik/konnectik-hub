import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { WalletTransaction } from '@/types/database';

const QUERY_KEY = ['wallet-transactions'];

export const useWalletTransactions = (userId?: string) => {
  const key = userId ? ['wallet-transactions', userId] : QUERY_KEY;
  useRealtimeSubscription('wallet_transactions', key);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return data as WalletTransaction[];
    },
  });
};
