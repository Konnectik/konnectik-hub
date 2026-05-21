import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';

export interface ProviderRow {
  id: string;
  user_id: string;
  business_name: string;
  phone: string | null;
  kyc_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  profile_name: string | null;
  profile_email: string | null;
  wallet_balance: number;
}

export const useProviders = () => {
  useRealtimeSubscription('providers', ['providers']);
  return useQuery({
    queryKey: ['providers'],
    queryFn: async (): Promise<ProviderRow[]> => {
      const { data: providers, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = (providers || []).map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const { data: wallets } = await supabase
        .from('provider_wallets')
        .select('provider_id, balance_xaf')
        .in('provider_id', (providers || []).map((p: any) => p.id));

      return (providers || []).map((p: any) => {
        const profile = profiles?.find((pr: any) => pr.id === p.user_id);
        const wallet = wallets?.find((w: any) => w.provider_id === p.id);
        return {
          ...p,
          profile_name: profile?.full_name || null,
          profile_email: profile?.email || null,
          wallet_balance: wallet?.balance_xaf ?? 0,
        };
      });
    },
  });
};

export const useUnlinkedOwners = () => {
  return useQuery({
    queryKey: ['unlinked-owners'],
    queryFn: async () => {
      // Get all users with 'owner' role
      const { data: ownerRoles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'owner');
      if (rolesErr) throw rolesErr;

      const ownerIds = (ownerRoles || []).map((r: any) => r.user_id);
      if (ownerIds.length === 0) return [];

      // Get existing providers
      const { data: existingProviders } = await supabase
        .from('providers')
        .select('user_id');

      const linkedIds = new Set((existingProviders || []).map((p: any) => p.user_id));
      const unlinkedIds = ownerIds.filter((id: string) => !linkedIds.has(id));
      if (unlinkedIds.length === 0) return [];

      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', unlinkedIds);
      if (profilesErr) throw profilesErr;

      return profiles || [];
    },
  });
};

export const useCreateProvider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; businessName: string; phone?: string }) => {
      const { data: provider, error } = await supabase
        .from('providers')
        .insert({ user_id: params.userId, business_name: params.businessName, phone: params.phone || null })
        .select()
        .single();
      if (error) throw error;

      const { error: walletErr } = await supabase
        .from('provider_wallets')
        .insert({ provider_id: provider.id, balance_xaf: 0 });
      if (walletErr) throw walletErr;

      return provider;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
      qc.invalidateQueries({ queryKey: ['unlinked-owners'] });
    },
  });
};

export const useUpdateProvider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: { business_name?: string; phone?: string; kyc_status?: string } }) => {
      const { error } = await supabase
        .from('providers')
        .update(params.updates)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
};

export const useDeleteProvider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
      qc.invalidateQueries({ queryKey: ['unlinked-owners'] });
    },
  });
};
