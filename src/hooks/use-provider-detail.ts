import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AccessPoint, ProviderEarningsLedger } from '@/types/database';

export interface ProviderDetail {
  id: string;
  user_id: string;
  business_name: string;
  phone: string | null;
  kyc_status: string;
  approved_at: string | null;
  created_at: string;
  profile_name: string | null;
  profile_email: string | null;
  wallet_balance: number;
}

export function useProviderDetail(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-detail', providerId],
    queryFn: async (): Promise<ProviderDetail | null> => {
      if (!providerId) return null;

      const { data: provider, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', provider.user_id)
        .single();

      const { data: wallet } = await supabase
        .from('provider_wallets')
        .select('balance_xaf')
        .eq('provider_id', providerId)
        .maybeSingle();

      return {
        ...provider,
        profile_name: profile?.full_name || null,
        profile_email: profile?.email || null,
        wallet_balance: wallet?.balance_xaf ?? 0,
      };
    },
    enabled: !!providerId,
  });
}

export function useProviderZones(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-zones', providerId],
    queryFn: async (): Promise<AccessPoint[]> => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from('access_points')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccessPoint[];
    },
    enabled: !!providerId,
  });
}

export function useProviderEarningsBreakdown(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-earnings-breakdown', providerId],
    queryFn: async () => {
      if (!providerId) return { earnings: [] as ProviderEarningsLedger[], totals: { gross: 0, fees: 0, net: 0, segments: 0 } };
      const { data, error } = await supabase
        .from('provider_earnings_ledger')
        .select('*')
        .eq('provider_id', providerId)
        .order('allocated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const earnings = (data ?? []) as ProviderEarningsLedger[];
      const totals = earnings.reduce(
        (acc, e) => ({
          gross: acc.gross + e.gross_xaf,
          fees: acc.fees + e.platform_fee_xaf,
          net: acc.net + e.net_xaf,
          segments: acc.segments + 1,
        }),
        { gross: 0, fees: 0, net: 0, segments: 0 }
      );
      return { earnings, totals };
    },
    enabled: !!providerId,
  });
}

export function useProviderPayouts(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-payouts', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      // Payouts are wallet_transactions of type 'debit' linked to the provider's user
      const { data: provider } = await supabase
        .from('providers')
        .select('user_id')
        .eq('id', providerId)
        .single();
      if (!provider) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', provider.user_id)
        .in('type', ['debit'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!providerId,
  });
}
