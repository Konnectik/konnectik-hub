import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PayoutRequest {
  id: string;
  provider_id: string;
  requested_by: string;
  amount_xaf: number;
  fee_xaf: number;
  net_xaf: number;
  method: 'momo' | 'om' | 'bank';
  phone_number: string | null;
  status: PayoutStatus;
  reference: string;
  aggregator_ref: string | null;
  error_message: string | null;
  requested_at: string;
  completed_at: string | null;
  updated_at: string;
}

export function usePayoutRequests(providerId: string | undefined) {
  return useQuery({
    queryKey: ['payout-requests', providerId],
    queryFn: async (): Promise<PayoutRequest[]> => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('provider_id', providerId)
        .order('requested_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PayoutRequest[];
    },
    enabled: !!providerId,
    refetchInterval: 30_000,
  });
}
