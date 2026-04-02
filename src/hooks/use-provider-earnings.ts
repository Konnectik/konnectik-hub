import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProviderEarningsLedger } from '@/types/database';

export interface ProviderEarningsSummary {
  provider_id: string;
  business_name: string;
  user_id: string;
  total_segments: number;
  total_gross_xaf: number;
  total_fees_xaf: number;
  total_net_xaf: number;
  current_balance_xaf: number;
}

export function useProviderProfile() {
  return useQuery({
    queryKey: ['provider-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useProviderEarningsSummary(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-earnings-summary', providerId],
    queryFn: async (): Promise<ProviderEarningsSummary | null> => {
      if (!providerId) return null;

      // Get provider info
      const { data: provider, error: pErr } = await supabase
        .from('providers')
        .select('id, business_name, user_id')
        .eq('id', providerId)
        .single();
      if (pErr) throw pErr;

      // Get earnings aggregate
      const { data: earnings, error: eErr } = await supabase
        .from('provider_earnings_ledger')
        .select('gross_xaf, platform_fee_xaf, net_xaf')
        .eq('provider_id', providerId);
      if (eErr) throw eErr;

      // Get wallet balance
      const { data: wallet } = await supabase
        .from('provider_wallets')
        .select('balance_xaf')
        .eq('provider_id', providerId)
        .maybeSingle();

      const totalGross = earnings?.reduce((s, e) => s + e.gross_xaf, 0) ?? 0;
      const totalFees = earnings?.reduce((s, e) => s + e.platform_fee_xaf, 0) ?? 0;
      const totalNet = earnings?.reduce((s, e) => s + e.net_xaf, 0) ?? 0;

      return {
        provider_id: provider.id,
        business_name: provider.business_name,
        user_id: provider.user_id,
        total_segments: earnings?.length ?? 0,
        total_gross_xaf: totalGross,
        total_fees_xaf: totalFees,
        total_net_xaf: totalNet,
        current_balance_xaf: wallet?.balance_xaf ?? 0,
      };
    },
    enabled: !!providerId,
  });
}

export function useProviderEarningsHistory(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-earnings-history', providerId],
    queryFn: async (): Promise<ProviderEarningsLedger[]> => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from('provider_earnings_ledger')
        .select('*')
        .eq('provider_id', providerId)
        .order('allocated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ProviderEarningsLedger[];
    },
    enabled: !!providerId,
  });
}
